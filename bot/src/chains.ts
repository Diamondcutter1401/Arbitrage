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
  const hasValidPk = /^0x[0-9a-fA-F]{64}$/.test(pk);
  const account = hasValidPk ? privateKeyToAccount(pk as `0x${string}`) : undefined;
  const publicClient = createPublicClient({ 
    chain, 
    transport: http(rpcUrl) 
  });
  const walletClient = hasValidPk
    ? createWalletClient({ chain, account: account!, transport: http(rpcUrl) })
    : undefined;
  return { publicClient, walletClient, account };
}
