import { PublicClient, encodePacked, Address, getAddress } from "viem";

const QUOTER_V2_ABI = [
  {
    name: "quoteExactInput",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" }
    ],
    outputs: [
      { name: "amountOut", type: "uint256" }
    ]
  }
] as const;

export async function quoteUniV3ExactIn(
  client: PublicClient,
  quoterAddress: Address,
  path: `0x${string}`,
  amountIn: bigint
): Promise<bigint> {
  try {
    // Ensure checksummed address to satisfy viem's validation
    const checksumQuoter = getAddress(quoterAddress);

    // Use readContract for automatic ABI encoding/decoding & revert handling
    const amountOut = await client.readContract({
      abi: QUOTER_V2_ABI,
      address: checksumQuoter,
      functionName: "quoteExactInput",
      args: [path, amountIn]
    });
    return amountOut as bigint;
  } catch (error) {
    console.error("Error quoting UniV3:", error);
    return 0n;
  }
}

// Helper to build path: tokenIn (20) + fee (3) + tokenOut (20) [+ fee + token...]
export function encodePath(tokens: Address[], fees: number[]): `0x${string}` {
  if (tokens.length !== fees.length + 1) {
    throw new Error("Invalid path: tokens length must be fees length + 1");
  }

  const parts: (string | number)[] = [];
  
  for (let i = 0; i < fees.length; i++) {
    parts.push(tokens[i], fees[i], tokens[i + 1]);
  }

  const types = ["address", "uint24", "address"];
  if (fees.length > 1) {
    // Add additional uint24, address pairs for multi-hop paths
    for (let i = 1; i < fees.length; i++) {
      types.push("uint24", "address");
    }
  }

  return encodePacked(types as any, parts) as `0x${string}`;
}
