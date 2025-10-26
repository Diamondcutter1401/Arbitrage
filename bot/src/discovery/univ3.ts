import fetch from "node-fetch";

export interface Pool {
  id: string;
  token0: {
    id: string;
    symbol: string;
    decimals: number;
  };
  token1: {
    id: string;
    symbol: string;
    decimals: number;
  };
  feeTier: string;
  liquidity: string;
  totalValueLockedUSD: string;
}

export async function fetchTopUniV3Pools(
  subgraphUrl: string, 
  minTvlUsd = 100_000
): Promise<Pool[]> {
  const query = `
    {
      pools(first: 200, orderBy: totalValueLockedUSD, orderDirection: desc) {
        id
        feeTier
        liquidity
        token0 {
          id
          symbol
          decimals
        }
        token1 {
          id
          symbol
          decimals
        }
        totalValueLockedUSD
      }
    }
  `;

  try {
    const response = await fetch(subgraphUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query })
    });

    const json = await response.json() as any;
    
    if (json.errors) {
      console.error("GraphQL errors:", json.errors);
      return [];
    }

    return (json.data.pools as Pool[]).filter(
      p => Number(p.totalValueLockedUSD) >= minTvlUsd
    );
  } catch (error) {
    console.error("Error fetching UniV3 pools:", error);
    return [];
  }
}
