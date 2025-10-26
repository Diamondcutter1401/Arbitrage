export function minProfitUSD(gasUSD: number, flashFeePct: number, additional = 0.0): number {
  return additional + gasUSD + flashFeePct;
}

export function routeAllowed(tvlUSD: number, hops: number, deny: boolean): boolean {
  return tvlUSD >= 100_000 && hops <= 3 && !deny;
}

export interface RouteScore {
  profitUSD: number;
  gasUSD: number;
  flashFeeUSD: number;
  tvlUSD: number;
  allowed: boolean;
}

export function scoreRoute(
  amountInUSD: number,
  amountOutUSD: number,
  gasUSD: number,
  flashFeePct: number,
  tvlUSD: number,
  hops: number,
  denied: boolean
): RouteScore {
  const profitUSD = amountOutUSD - amountInUSD;
  const flashFeeUSD = amountInUSD * flashFeePct;
  const netProfitUSD = profitUSD - gasUSD - flashFeeUSD;
  
  return {
    profitUSD: netProfitUSD,
    gasUSD,
    flashFeeUSD,
    tvlUSD,
    allowed: routeAllowed(tvlUSD, hops, denied)
  };
}
