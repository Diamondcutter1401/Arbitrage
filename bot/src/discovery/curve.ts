import fetch from "node-fetch";

export interface CurvePool {
  id: string;
  coins: Array<{
    id: string;
    address: string;
    symbol: string;
    decimals: number;
    index: number;
  }>;
  totalValueLockedUSD: string;
}

export async function fetchCurvePools(
  subgraphUrl: string, 
  minTvlUsd = 100_000
): Promise<CurvePool[]> {
  const query = `
    {
      pools(first: 200, orderBy: totalValueLockedUSD, orderDirection: desc) {
        id
        coins {
          id
          address
          symbol
          decimals
          index
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

    return (json.data.pools as CurvePool[]).filter(
      p => Number(p.totalValueLockedUSD) >= minTvlUsd
    );
  } catch (error) {
    console.error("Error fetching Curve pools:", error);
    return [];
  }
}
