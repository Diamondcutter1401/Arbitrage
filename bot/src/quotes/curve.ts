import { PublicClient, Address, encodeFunctionData } from "viem";

const CURVE_ABI = [
  {
    name: "get_dy",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "i", type: "int128" },
      { name: "j", type: "int128" },
      { name: "dx", type: "uint256" }
    ],
    outputs: [
      { name: "dy", type: "uint256" }
    ]
  }
] as const;

export async function quoteCurveGetDy(
  client: PublicClient, 
  pool: Address, 
  i: bigint, 
  j: bigint, 
  dx: bigint
): Promise<bigint> {
  try {
    const data = encodeFunctionData({
      abi: CURVE_ABI,
      functionName: "get_dy",
      args: [i, j, dx]
    });

    const result = await client.call({
      to: pool,
      data
    });

    if (!result.data) {
      throw new Error("No data returned from Curve pool");
    }

    // Decode the result (dy is the first return value)
    const dy = BigInt(result.data.slice(2, 66)); // First 32 bytes
    return dy;
  } catch (error) {
    console.error("Error quoting Curve pool:", error);
    return 0n;
  }
}
