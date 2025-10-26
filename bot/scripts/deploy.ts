#!/usr/bin/env tsx

import { config } from "dotenv";
import { makeClients, ChainKey } from "../src/chains";

config();

async function deployContract(chainKey: ChainKey) {
  console.log(`Deploying ArbExecutor contract to ${chainKey}...`);
  
  const chainConfig = require(`../config/chains.json`)[chainKey];
  const { walletClient } = makeClients(
    chainKey,
    chainConfig.rpc,
    process.env.SEARCHER_PK || ""
  );

  try {
    // This is a simplified deployment script
    // In practice, you'd use Foundry or Hardhat for contract deployment
    
    console.log("Contract deployment would be handled by Foundry/Hardhat");
    console.log("Please use the following commands:");
    console.log("");
    console.log("1. Compile contracts:");
    console.log("   cd contracts && forge build");
    console.log("");
    console.log("2. Deploy to Base:");
    console.log(`   forge script script/Deploy.s.sol:DeployScript --rpc-url ${chainConfig.rpc} --private-key $SEARCHER_PK --broadcast`);
    console.log("");
    console.log("3. Update configuration:");
    console.log("   - Update bot/config/chains.json with deployed addresses");
    console.log("   - Update ops/.env with EXECUTOR_CONTRACT address");
    console.log("");
    console.log("Required constructor parameters:");
    console.log(`   - Permit2: ${chainConfig.permit2}`);
    console.log(`   - Aave Pool: ${chainConfig.aavePool}`);

  } catch (error) {
    console.error(`Error deploying contract to ${chainKey}:`, error);
  }
}

async function main() {
  const chainKey = process.argv[2] as ChainKey;
  
  if (!chainKey || !["base", "arbitrum"].includes(chainKey)) {
    console.error("Usage: tsx scripts/deploy.ts <chain>");
    console.error("Chains: base, arbitrum");
    process.exit(1);
  }

  await deployContract(chainKey);
}

main().catch(console.error);
