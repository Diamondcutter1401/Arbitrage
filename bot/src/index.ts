import { config } from "dotenv";
import path from "path";
import { makeClients, ChainKey } from "./chains";
import { Database } from "./db";
import { MetricsLogger } from "./metrics";
import { RiskManager } from "./risk";
import { fetchTopUniV3Pools } from "./discovery/univ3";
import { fetchCurvePools } from "./discovery/curve";
import { quoteUniV3ExactIn, encodePath } from "./quotes/univ3";
import { quoteCurveGetDy } from "./quotes/curve";
import { genTwoAndThreeLegs, Route } from "./route/gen";
import { scoreRoute } from "./route/score";
import { buildExecuteData } from "./exec/tx";
import { sendPrivateOrPublicTx } from "./exec/bundle";
import { Address, keccak256, toHex } from "viem";

// Load environment variables (first try local .env, then fallback to ops/.env)
config();
if (!process.env.BASE_RPC && !process.env.ARB_RPC) {
  const opsEnvPath = path.resolve(__dirname, "../../ops/.env");
  try {
    config({ path: opsEnvPath });
    if (process.env.BASE_RPC || process.env.ARB_RPC) {
      console.log(`Loaded environment from ops/.env at ${opsEnvPath}`);
    }
  } catch (e) {
    console.warn("Could not load ops/.env", e);
  }
}

interface BotConfig {
  chains: Record<ChainKey, any>;
  tokens: Record<string, any>;
  dex: Record<string, any>;
  strategy: any;
  denylist: string[];
}

class ArbitrageBot {
  private db: Database;
  private metrics: MetricsLogger;
  private riskManager: RiskManager;
  private config: BotConfig;
  private isRunning = false;

  constructor() {
    this.db = new Database(process.env.DATABASE_URL || "");
    this.metrics = new MetricsLogger();
    this.riskManager = RiskManager.fromEnv();
    
    // Load configs
    this.config = {
      chains: require("../config/chains.json"),
      tokens: require("../config/tokens.base.json"), // Default to base
      dex: require("../config/dex.base.json"),
      strategy: require("../config/strategy.json"),
      denylist: require("../config/denylist.json")
    };

    // Interpolate environment variables inside JSON configs of the form ${VAR}
    const interpolate = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === "string") {
        return obj.replace(/\$\{([A-Z0-9_]+)\}/g, (_: string, v: string) => process.env[v] ?? "");
      }
      if (Array.isArray(obj)) return obj.map(interpolate);
      if (typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          (obj as any)[k] = interpolate((obj as any)[k]);
        }
        return obj;
      }
      return obj;
    };
    this.config.chains = interpolate(this.config.chains);
  }

  async start(): Promise<void> {
    console.log("Starting arbitrage bot...");
    this.isRunning = true;

    // Start monitoring loop
    while (this.isRunning) {
      try {
        await this.runCycle();
        await this.sleep(1000); // 1 second between cycles
      } catch (error) {
        console.error("Error in main loop:", error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  async runCycle(): Promise<void> {
    // Check risk conditions
    if (this.riskManager.shouldPause()) {
      console.log("Bot paused due to risk conditions");
      return;
    }

    // Process each chain
    for (const chainKey of Object.keys(this.config.chains) as ChainKey[]) {
      await this.processChain(chainKey);
    }
  }

  async processChain(chainKey: ChainKey): Promise<void> {
  const chainConfig = this.config.chains[chainKey];
    const { publicClient, walletClient } = makeClients(
      chainKey,
      chainConfig.rpc,
      process.env.SEARCHER_PK || ""
    );

    try {
      if (!chainConfig?.rpc) {
        console.warn(`[${chainKey}] Missing RPC URL. Set BASE_RPC/ARB_RPC in ops/.env.`);
        return;
      }

      // Sanity check: ensure Uniswap Quoter is deployed on this chain
      try {
        const code = await publicClient.getBytecode({ address: chainConfig.univ3.quoterV2 });
        if (!code || code === "0x") {
          console.warn(
            `[${chainKey}] Uniswap QuoterV2 not found at ${chainConfig.univ3.quoterV2}. ` +
            `Please update bot/config/chains.json (univ3.quoterV2) to the correct address for this chain. Skipping.`
          );
          return;
        }
      } catch (e) {
        console.warn(`[${chainKey}] Could not fetch bytecode for quoter at ${chainConfig.univ3.quoterV2}:`, e);
      }

      const uniPools = await fetchTopUniV3Pools(
        chainConfig.univ3.subgraph,
        this.config.strategy.minTvlUsd
      );
      const curvePools = await fetchCurvePools(
        chainConfig.curve.subgraph,
        this.config.strategy.minTvlUsd
      );
      console.log(`[${chainKey}] Pools => UniV3: ${uniPools.length}, Curve: ${curvePools.length}`);

  const routes = await this.generateRoutes(chainKey, uniPools, curvePools, chainConfig);
      console.log(`[${chainKey}] Generated routes: ${routes.length}`);

      if (routes.length === 0) {
        console.log(`[${chainKey}] No routes to evaluate (likely discovery disabled or empty).`);
        return;
      }

      const profitableRoutes = await this.quoteRoutes(
        chainKey,
        routes,
        publicClient,
        chainConfig
      );
      console.log(`[${chainKey}] Profitable routes: ${profitableRoutes.length}`);

      if (profitableRoutes.length > 0) {
        const bestRoute = profitableRoutes[0];
        await this.executeRoute(
          chainKey,
          bestRoute,
          walletClient,
          publicClient,
          chainConfig
        );
      }
    } catch (error) {
      console.error(`Error processing chain ${chainKey}:`, error);
    }
  }

  async generateRoutes(chainKey: ChainKey, uniPools: any[], curvePools: any[], chainConfig?: any): Promise<Route[]> {
    const routes: Route[] = [];
    const legs: any[] = [];
    // Add UniV3 legs (limit for performance). Use router address for execution
    for (const pool of uniPools.slice(0, 10)) {
      try {
        legs.push({
          dex: "uniV3" as const,
          addr: chainConfig?.univ3?.router,
          data: encodePath([pool.token0.id, pool.token1.id], [parseInt(pool.feeTier)]),
          tokenIn: pool.token0.id,
          tokenOut: pool.token1.id
        });
      } catch (e) {
        console.warn("Failed to encode path for pool", pool.id, e);
      }
    }
    // Fallback: if no UniV3 pools discovered, synthesize from token list and common fee tiers
    if (uniPools.length === 0 && chainConfig?.univ3?.router) {
      try {
        const tokens = chainKey === "base"
          ? require("../config/tokens.base.json")
          : require("../config/tokens.arb.json");
        const feeTiers = [500, 3000];
        const pairs: Array<[string, string]> = [];
        if (tokens.USDC && tokens.WETH) pairs.push([tokens.USDC.address, tokens.WETH.address]);
        if (tokens.USDT && tokens.WETH) pairs.push([tokens.USDT.address, tokens.WETH.address]);
        if (tokens.DAI && tokens.WETH) pairs.push([tokens.DAI.address, tokens.WETH.address]);
        for (const [a, b] of pairs) {
          for (const fee of feeTiers) {
            legs.push({ 
              dex: "uniV3" as const, 
              addr: chainConfig.univ3.router as Address, 
              data: encodePath([a as Address, b as Address], [fee]), 
              tokenIn: a as Address, 
              tokenOut: b as Address 
            });
            legs.push({ 
              dex: "uniV3" as const, 
              addr: chainConfig.univ3.router as Address, 
              data: encodePath([b as Address, a as Address], [fee]), 
              tokenIn: b as Address, 
              tokenOut: a as Address 
            });
          }
        }
        console.log(`[${chainKey}] Using fallback UniV3 legs from tokens list: ${legs.length}`);
      } catch (e) {
        console.warn(`[${chainKey}] Fallback UniV3 leg generation failed:`, e);
      }
    }
    // Future: add Curve legs here
    for (const route of genTwoAndThreeLegs(legs)) {
      routes.push(route);
      if (routes.length >= 100) break; // safety cap
    }
    return routes;
  }

  async quoteRoutes(
    chainKey: ChainKey,
    routes: Route[],
    publicClient: any,
    chainConfig: any
  ): Promise<any[]> {
    const profitableRoutes: any[] = [];

    for (const route of routes) {
      try {
        let amountOut = 0n;
        
        // Simulate route execution (simplified)
        for (const leg of route.legs) {
          if (leg.dex === "uniV3") {
            const quote = await quoteUniV3ExactIn(
              publicClient,
              chainConfig.univ3.quoterV2,
              leg.data,
              1000000n // 1M wei test amount
            );
            amountOut = quote;
          } else if (leg.dex === "curve") {
            const quote = await quoteCurveGetDy(
              publicClient,
              leg.addr,
              0n, // i
              1n, // j
              1000000n // 1M wei test amount
            );
            amountOut = quote;
          }
        }

        // Score route
        const amountInUSD = 1.0;
        const amountOutUSD = Number(amountOut) / 1e18; // simplified
        const gasUSD = 0.01;
        const flashFeePct = this.config.strategy.flashloan.feePct;
        const tvlUSD = 100000; // placeholder TVL
        const score = scoreRoute(
          amountInUSD,
          amountOutUSD,
          gasUSD,
          flashFeePct,
          tvlUSD,
          route.legs.length,
          false // denied
        );

        if (score.allowed && score.profitUSD > this.config.strategy.profitFloorUsd) {
          const routeHash = keccak256(toHex(JSON.stringify(route)));
          // Persist quote (best-effort; no-op if DB disabled)
          await this.db.insertQuote({
            ts: new Date(),
            chain: chainKey,
            route_hash: routeHash,
            amount_in_usd: amountInUSD,
            amount_out_usd: amountOutUSD,
            gas_estimate_usd: gasUSD,
            flash_fee_usd: amountInUSD * flashFeePct,
            profit_usd: score.profitUSD,
            legs: route.legs
          });

          profitableRoutes.push({
            route,
            score,
            amountOut
          });
        }

      } catch (error) {
        console.error("Error quoting route:", error);
      }
    }

    // Sort by profit
    const sorted = profitableRoutes.sort((a, b) => b.score.profitUSD - a.score.profitUSD);
    // Log top 3 candidates for visibility in dry-run mode
    const top = sorted.slice(0, 3);
    for (const [idx, cand] of top.entries()) {
      const inp = cand.route.input;
      const out = cand.route.output;
      console.log(
        `Top #${idx + 1}: profit=$${cand.score.profitUSD.toFixed(4)} hops=${cand.route.legs.length} input=${inp} output=${out}`
      );
    }
    return sorted;
  }

  async executeRoute(
    chainKey: ChainKey,
    routeData: any,
    walletClient: any,
    publicClient: any,
    chainConfig: any
  ): Promise<void> {
    try {
      const { route, score, amountOut } = routeData;
      
      // Build transaction data (encoded calldata)
      const txData = buildExecuteData(
        route,
        1000000n, // amountIn
        BigInt(Math.floor(amountOut * 0.95)), // minReturn (5% slippage)
        Math.floor(Date.now() / 1000) + 300, // deadline (5 minutes)
        this.config.strategy.flashloan.enabled
      );

      // Get gas price
      const gasPrice = await this.riskManager.getOptimalGasPrice(publicClient);

      // Build transaction
      const executor = process.env.EXECUTOR_CONTRACT as Address | undefined;
      if (!walletClient || !executor) {
        console.warn("Missing wallet or EXECUTOR_CONTRACT; skipping execution.");
        return;
      }
      const tx = {
        to: executor,
        data: txData.data,
        gas: 500000n,
        gasPrice,
        value: 0n
      };

      // Sign transaction
  const signedTx = await walletClient.signTransaction(tx as any);

      // Send transaction
      const txHash = await sendPrivateOrPublicTx(
        signedTx,
        chainConfig.privateTxRpc,
        walletClient
      );

      console.log(`Executed route on ${chainKey}: ${txHash}`);
      console.log(`Expected profit: $${score.profitUSD.toFixed(4)}`);

      // Record execution
      await this.db.insertExecution({
        ts: new Date(),
        chain: chainKey,
        tx_hash: txHash,
        private_sent: !!chainConfig.privateTxRpc,
        status: "pending",
        profit_usd: score.profitUSD
      });

      // Record metrics
      this.metrics.recordCounter("executions_total", 1, { chain: chainKey });
      this.metrics.recordGauge("profit_usd", score.profitUSD, { chain: chainKey });

    } catch (error) {
      console.error("Error executing route:", error);
      
      // Record failure
      await this.db.insertExecution({
        ts: new Date(),
        chain: chainKey,
        private_sent: false,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown error"
      });

      this.riskManager.recordTransaction(false);
    }
  }

  async stop(): Promise<void> {
    console.log("Stopping arbitrage bot...");
    this.isRunning = false;
    await this.db.close();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start bot if run directly
if (require.main === module) {
  const bot = new ArbitrageBot();
  
  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await bot.stop();
    process.exit(0);
  });

  bot.start().catch(console.error);
}

export { ArbitrageBot };
