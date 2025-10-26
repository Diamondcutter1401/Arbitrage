#!/usr/bin/env tsx

import { config } from "dotenv";
import { makeClients, ChainKey } from "../src/chains";
import { Database } from "../src/db";

config();

async function backtest(chainKey: ChainKey, startBlock: number, endBlock: number) {
  console.log(`Running backtest for ${chainKey} from block ${startBlock} to ${endBlock}...`);
  
  const chainConfig = require(`../config/chains.json`)[chainKey];
  const { publicClient } = makeClients(
    chainKey,
    chainConfig.rpc,
    process.env.SEARCHER_PK || ""
  );

  const db = new Database(process.env.DATABASE_URL || "");

  try {
    // Get pools from database
    const pools = await db.getRecentQuotes(chainKey, 1000);
    console.log(`Found ${pools.length} pools to test`);

    const results: any[] = [];

    // Test each block in the range
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber += 10) {
      try {
        console.log(`Testing block ${blockNumber}...`);
        
        // Get block data
        const block = await publicClient.getBlock({ blockNumber: BigInt(blockNumber) });
        
        // Simulate route quotes at this block
        // This is a simplified example - in reality you'd:
        // 1. Get pool states at this block
        // 2. Calculate quotes for different routes
        // 3. Determine profitability
        
        const mockQuote = {
          blockNumber,
          timestamp: new Date(Number(block.timestamp) * 1000),
          gasPrice: Number(block.baseFeePerGas || 0n) / 1e9, // Convert to Gwei
          profitableRoutes: Math.floor(Math.random() * 5), // Mock data
          avgProfit: Math.random() * 0.1 // Mock data
        };

        results.push(mockQuote);

        // Store results
        await db.insertQuote({
          ts: mockQuote.timestamp,
          chain: chainKey,
          route_hash: `0x${blockNumber.toString(16)}`,
          amount_in_usd: 1000,
          amount_out_usd: 1000 + mockQuote.avgProfit * 1000,
          gas_estimate_usd: mockQuote.gasPrice * 0.0001,
          flash_fee_usd: 0.7,
          profit_usd: mockQuote.avgProfit * 1000 - mockQuote.gasPrice * 0.0001 - 0.7,
          legs: { blockNumber, routes: mockQuote.profitableRoutes }
        });

      } catch (error) {
        console.error(`Error testing block ${blockNumber}:`, error);
      }
    }

    // Generate summary report
    console.log("\n=== Backtest Summary ===");
    console.log(`Chain: ${chainKey}`);
    console.log(`Blocks tested: ${results.length}`);
    console.log(`Total profitable opportunities: ${results.reduce((sum, r) => sum + r.profitableRoutes, 0)}`);
    console.log(`Average profit per opportunity: $${(results.reduce((sum, r) => sum + r.avgProfit, 0) / results.length).toFixed(4)}`);

  } catch (error) {
    console.error(`Error running backtest for ${chainKey}:`, error);
  } finally {
    await db.close();
  }
}

async function main() {
  const chainKey = process.argv[2] as ChainKey;
  const startBlock = parseInt(process.argv[3]) || 0;
  const endBlock = parseInt(process.argv[4]) || startBlock + 100;
  
  if (!chainKey || !["base", "arbitrum"].includes(chainKey)) {
    console.error("Usage: tsx scripts/backtest.ts <chain> [startBlock] [endBlock]");
    console.error("Chains: base, arbitrum");
    process.exit(1);
  }

  await backtest(chainKey, startBlock, endBlock);
}

main().catch(console.error);
