import { config } from "dotenv";
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
import { Address } from "viem";

// Load environment variables
config();

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
    this.riskManager = new RiskManager({
      pauseAboveBaseFeePctl: 0.9,
      pauseFailRatePct: 20,
      maxGasPriceGwei: 0.05,
      maxSlippageBps: 5
    });
    
    // Load configs
    this.config = {
      chains: require("../config/chains.json"),
      tokens: require("../config/tokens.base.json"), // Default to base
      dex: require("../config/dex.base.json"),
      strategy: require("../config/strategy.json"),
      denylist: require("../config/denylist.json")
    };
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
      // Discover pools
      const uniPools = await fetchTopUniV3Pools(
        chainConfig.univ3.subgraph,
        this.config.strategy.minTvlUsd
      );
      
      const curvePools = await fetchCurvePools(
        chainConfig.curve.subgraph,
        this.config.strategy.minTvlUsd
      );

      // Generate routes
      const routes = await this.generateRoutes(chainKey, uniPools, curvePools);
      
      // Quote routes
      const profitableRoutes = await this.quoteRoutes(
        chainKey,
        routes,
        publicClient,
        chainConfig
      );

      // Execute best route
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

  async generateRoutes(chainKey: ChainKey, uniPools: any[], curvePools: any[]): Promise<Route[]> {
    const routes: Route[] = [];
    
    // Convert pools to legs (simplified)
    const legs: any[] = [];
    
    // Add UniV3 legs
    for (const pool of uniPools.slice(0, 10)) { // Limit for performance
      legs.push({
        dex: "uniV3" as const,
        addr: pool.id,
        data: encodePath([pool.token0.id, pool.token1.id], [parseInt(pool.feeTier)]),
        tokenIn: pool.token0.id,
        tokenOut: pool.token1.id
      });
    }

    // Generate routes
    for (const route of genTwoAndThreeLegs(legs)) {
      routes.push(route);
    }

    return routes.slice(0, 100); // Limit routes for performance
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
        const score = scoreRoute(
          1.0, // amountInUSD
          Number(amountOut) / 1e18, // amountOutUSD (simplified)
          0.01, // gasUSD
          this.config.strategy.flashloan.feePct,
          100000, // tvlUSD
          route.legs.length,
          false // denied
        );

        if (score.allowed && score.profitUSD > this.config.strategy.profitFloorUsd) {
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
    return profitableRoutes.sort((a, b) => b.score.profitUSD - a.score.profitUSD);
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
      
      // Build transaction data
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
      const tx = {
        to: process.env.EXECUTOR_CONTRACT as Address,
        data: txData,
        gas: 500000n,
        gasPrice,
        value: 0n
      };

      // Sign transaction
      const signedTx = await walletClient.signTransaction(tx);

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
