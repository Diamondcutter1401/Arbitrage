#!/usr/bin/env tsx

import { config } from "dotenv";
import { makeClients, ChainKey } from "../src/chains";
import { Database } from "../src/db";

config();

async function backfill(chainKey: ChainKey, days: number) {
  console.log(`Backfilling ${days} days of data for ${chainKey}...`);
  
  const chainConfig = require(`../config/chains.json`)[chainKey];
  const { publicClient } = makeClients(
    chainKey,
    chainConfig.rpc,
    process.env.SEARCHER_PK || ""
  );

  const db = new Database(process.env.DATABASE_URL || "");

  try {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (days * 24 * 60 * 60);
    
    console.log(`Backfilling from ${new Date(startTime * 1000)} to ${new Date(endTime * 1000)}`);

    // Get historical blocks
    const currentBlock = await publicClient.getBlockNumber();
    const startBlock = currentBlock - BigInt(Math.floor(days * 24 * 60 * 60 / 12)); // ~12 second blocks
    
    console.log(`Processing blocks ${startBlock} to ${currentBlock}`);

    // Process blocks in batches
    const batchSize = 100;
    for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber += BigInt(batchSize)) {
      try {
        const endBatchBlock = blockNumber + BigInt(batchSize) > currentBlock 
          ? currentBlock 
          : blockNumber + BigInt(batchSize);

        console.log(`Processing blocks ${blockNumber} to ${endBatchBlock}...`);

        // Get block data
        const block = await publicClient.getBlock({ blockNumber });
        
        // Store gas price data
        await db.insertExecution({
          ts: new Date(Number(block.timestamp) * 1000),
          chain: chainKey,
          private_sent: false,
          status: "backfill",
          gas_price_gwei: Number(block.baseFeePerGas || 0n) / 1e9,
          reason: "Historical data backfill"
        });

        // Add some delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing block ${blockNumber}:`, error);
      }
    }

    console.log(`Backfill complete for ${chainKey}`);

  } catch (error) {
    console.error(`Error backfilling data for ${chainKey}:`, error);
  } finally {
    await db.close();
  }
}

async function main() {
  const chainKey = process.argv[2] as ChainKey;
  const days = parseInt(process.argv[3]) || 7;
  
  if (!chainKey || !["base", "arbitrum"].includes(chainKey)) {
    console.error("Usage: tsx scripts/backfill.ts <chain> [days]");
    console.error("Chains: base, arbitrum");
    process.exit(1);
  }

  await backfill(chainKey, days);
}

main().catch(console.error);
