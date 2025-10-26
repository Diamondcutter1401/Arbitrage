import { createPublicClient, http, createWalletClient, Address, Chain } from "viem";
import { base, arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export type ChainKey = "base" | "arbitrum";

export const CHAINS: Record<ChainKey, Chain> = { 
  base, 
  arbitrum 
};

export interface ChainConfig {
  rpc: string;
  privateTxRpc?: string;
  aavePool: Address;
  univ3: {
    router: Address;
    quoterV2: Address;
    subgraph: string;
  };
  curve: {
    registry: Address;
    subgraph: string;
  };
  permit2: Address;
}

export function makeClients(chainKey: ChainKey, rpcUrl: string, pk: string) {
  const chain = CHAINS[chainKey];
  const account = privateKeyToAccount(pk as `0x${string}`);
  const publicClient = createPublicClient({ 
    chain, 
    transport: http(rpcUrl) 
  });
  const walletClient = createWalletClient({ 
    chain, 
    account, 
    transport: http(rpcUrl) 
  });
  return { publicClient, walletClient, account };
}
