import { Address } from "viem";

export interface Leg {
  dex: "uniV3" | "curve";
  addr: Address;
  data: `0x${string}`;
  tokenIn: Address;
  tokenOut: Address;
}

export interface Route {
  legs: Leg[];
  input: Address;
  output: Address;
}

export function* genTwoAndThreeLegs(candidates: Leg[]): Generator<Route> {
  // Generate 2-leg routes
  for (const a of candidates) {
    for (const b of candidates) {
      if (a.tokenOut === b.tokenIn && a.tokenIn !== b.tokenOut) {
        yield {
          legs: [a, b],
          input: a.tokenIn,
          output: b.tokenOut
        };
      }
    }
  }

  // Generate 3-leg routes
  for (const a of candidates) {
    for (const b of candidates) {
      for (const c of candidates) {
        if (
          a.tokenOut === b.tokenIn && 
          b.tokenOut === c.tokenIn && 
          c.tokenOut === a.tokenIn
        ) {
          yield {
            legs: [a, b, c],
            input: a.tokenIn,
            output: c.tokenOut
          };
        }
      }
    }
  }
}
