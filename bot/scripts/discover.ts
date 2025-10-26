#!/usr/bin/env tsx

import { config } from "dotenv";
import { makeClients, ChainKey } from "../src/chains";
import { fetchTopUniV3Pools } from "../src/discovery/univ3";
import { fetchCurvePools } from "../src/discovery/curve";
import { Database } from "../src/db";

config();

async function discoverPools(chainKey: ChainKey) {
  console.log(`Discovering pools for ${chainKey}...`);
  
  const chainConfig = require(`../config/chains.json`)[chainKey];
  const { publicClient } = makeClients(
    chainKey,
    chainConfig.rpc,
    process.env.SEARCHER_PK || ""
  );

  const db = new Database(process.env.DATABASE_URL || "");

  try {
    // Discover UniV3 pools
    console.log("Fetching UniV3 pools...");
    const uniPools = await fetchTopUniV3Pools(
      chainConfig.univ3.subgraph,
      100000 // min TVL
    );

    console.log(`Found ${uniPools.length} UniV3 pools`);

    // Store UniV3 pools
    for (const pool of uniPools) {
      await db.insertPool({
        id: 0, // Will be auto-generated
        chain: chainKey,
        dex: "univ3",
        address: pool.id,
        token0: pool.token0.id,
        token1: pool.token1.id,
        fee_bps: parseInt(pool.feeTier),
        tvl_usd: parseFloat(pool.totalValueLockedUSD),
        updated_at: new Date()
      });
    }

    // Discover Curve pools
    console.log("Fetching Curve pools...");
    const curvePools = await fetchCurvePools(
      chainConfig.curve.subgraph,
      100000 // min TVL
    );

    console.log(`Found ${curvePools.length} Curve pools`);

    // Store Curve pools
    for (const pool of curvePools) {
      await db.insertPool({
        id: 0, // Will be auto-generated
        chain: chainKey,
        dex: "curve",
        address: pool.id,
        token0: pool.coins[0]?.address || "",
        token1: pool.coins[1]?.address || "",
        fee_bps: undefined,
        tvl_usd: parseFloat(pool.totalValueLockedUSD),
        updated_at: new Date()
      });
    }

    console.log(`Discovery complete for ${chainKey}`);

  } catch (error) {
    console.error(`Error discovering pools for ${chainKey}:`, error);
  } finally {
    await db.close();
  }
}

async function main() {
  const chainKey = process.argv[2] as ChainKey;
  
  if (!chainKey || !["base", "arbitrum"].includes(chainKey)) {
    console.error("Usage: tsx scripts/discover.ts <chain>");
    console.error("Chains: base, arbitrum");
    process.exit(1);
  }

  await discoverPools(chainKey);
}

main().catch(console.error);
