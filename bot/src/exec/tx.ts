import { encodeFunctionData, Address } from "viem";
import { Route } from "../route/gen";

const ARB_EXECUTOR_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "route",
        type: "tuple",
        components: [
          {
            name: "hops",
            type: "tuple[]",
            components: [
              { name: "dex", type: "uint8" },
              { name: "routerOrPool", type: "address" },
              { name: "data", type: "bytes" },
              { name: "tokenIn", type: "address" },
              { name: "tokenOut", type: "address" }
            ]
          },
          { name: "inputToken", type: "address" },
          { name: "outputToken", type: "address" }
        ]
      },
      { name: "amountIn", type: "uint256" },
      { name: "minReturn", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [
      { name: "amountOut", type: "uint256" }
    ]
  },
  {
    name: "executeWithFlashloan",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "route",
        type: "tuple",
        components: [
          {
            name: "hops",
            type: "tuple[]",
            components: [
              { name: "dex", type: "uint8" },
              { name: "routerOrPool", type: "address" },
              { name: "data", type: "bytes" },
              { name: "tokenIn", type: "address" },
              { name: "tokenOut", type: "address" }
            ]
          },
          { name: "inputToken", type: "address" },
          { name: "outputToken", type: "address" }
        ]
      },
      { name: "amountIn", type: "uint256" },
      { name: "minReturn", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: []
  }
] as const;

export function buildExecuteData(
  route: Route,
  amountIn: bigint,
  minReturn: bigint,
  deadline: number,
  useFlashloan = false
): { data: `0x${string}`; functionName: string; abi: typeof ARB_EXECUTOR_ABI; args: readonly [
  { hops: { dex: number; routerOrPool: Address; data: `0x${string}`; tokenIn: Address; tokenOut: Address; }[]; inputToken: Address; outputToken: Address; },
  bigint,
  bigint,
  bigint
] } {
  const hops: { dex: number; routerOrPool: Address; data: `0x${string}`; tokenIn: Address; tokenOut: Address; }[] = route.legs.map(leg => ({
    dex: leg.dex === "uniV3" ? 1 : 2,
    routerOrPool: leg.addr,
    data: leg.data,
    tokenIn: leg.tokenIn,
    tokenOut: leg.tokenOut
  }));

  const routeData: { hops: { dex: number; routerOrPool: Address; data: `0x${string}`; tokenIn: Address; tokenOut: Address; }[]; inputToken: Address; outputToken: Address; } = {
    hops,
    inputToken: route.input,
    outputToken: route.output
  };

  const functionName = useFlashloan ? "executeWithFlashloan" : "execute";
  
  const args: readonly [
    { hops: { dex: number; routerOrPool: Address; data: `0x${string}`; tokenIn: Address; tokenOut: Address; }[]; inputToken: Address; outputToken: Address; },
    bigint,
    bigint,
    bigint
  ] = [routeData, amountIn, minReturn, BigInt(deadline)];
  const data = encodeFunctionData({ abi: ARB_EXECUTOR_ABI, functionName, args });
  return { data, functionName, abi: ARB_EXECUTOR_ABI, args };
}
