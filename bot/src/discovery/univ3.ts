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
  // Gracefully disable if no subgraph configured
  if (!subgraphUrl || !subgraphUrl.trim()) {
    return [];
  }
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
    const headers: Record<string,string> = { "content-type": "application/json" };
    const apiKey = process.env.GRAPH_API_KEY?.trim();
    const authMode = (process.env.GRAPH_AUTH_MODE || "bearer").toLowerCase();
    if (apiKey) {
      if (authMode === "bearer") headers["Authorization"] = `Bearer ${apiKey}`;
      else if (authMode === "apikey") headers["apikey"] = apiKey;
      else headers["Authorization"] = `Bearer ${apiKey}`; // default fallback
    }
    const response = await fetch(subgraphUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query })
    });

    // Ensure we got JSON
    if (!response.ok) {
      console.error(`UniV3 subgraph HTTP ${response.status} at ${subgraphUrl}`);
      return [];
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.error(`UniV3 subgraph returned non-JSON content-type: ${contentType}`);
      return [];
    }
    const json = await response.json() as any;
    
    if (json.errors) {
      // Collapse repetitive auth errors
      const msgs = json.errors.map((e: any) => e?.message || "");
      const authErr = msgs.some((m: string) => /auth/i.test(m));
      if (authErr) {
        console.error(`GraphQL auth error for UniV3 subgraph. Set GRAPH_API_KEY or fix header. messages=`, json.errors);
      } else {
        console.error("GraphQL errors:", json.errors);
      }
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
