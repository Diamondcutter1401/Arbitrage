import { encodeAbiParameters, parseAbiParameters, Address, WalletClient, PublicClient } from "viem";
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

export async function buildExecuteData(
  route: Route,
  amountIn: bigint,
  minReturn: bigint,
  deadline: number,
  useFlashloan = false
) {
  const hops = route.legs.map(leg => [
    leg.dex === "uniV3" ? 1 : 2, // Convert to uint8
    leg.addr,
    leg.data,
    leg.tokenIn,
    leg.tokenOut
  ]);

  const routeData = {
    hops,
    inputToken: route.input,
    outputToken: route.output
  };

  const functionName = useFlashloan ? "executeWithFlashloan" : "execute";
  
  return {
    functionName,
    args: [routeData, amountIn, minReturn, deadline],
    abi: ARB_EXECUTOR_ABI
  };
}
