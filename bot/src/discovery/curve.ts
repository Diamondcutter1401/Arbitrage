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
  // Gracefully disable if no subgraph configured
  if (!subgraphUrl || !subgraphUrl.trim()) {
    return [];
  }
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
    const headers: Record<string,string> = { "content-type": "application/json" };
    const apiKey = process.env.GRAPH_API_KEY?.trim();
    const authMode = (process.env.GRAPH_AUTH_MODE || "bearer").toLowerCase();
    if (apiKey) {
      if (authMode === "bearer") headers["Authorization"] = `Bearer ${apiKey}`;
      else if (authMode === "apikey") headers["apikey"] = apiKey;
      else headers["Authorization"] = `Bearer ${apiKey}`;
    }
    // Introspection: check whether the subgraph exposes a `pools` field on Query.
    // Some provider schemas differ; this avoids noisy GraphQL errors when the
    // field does not exist and gives a clearer log message.
    try {
      const introspectResp = await fetch(subgraphUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: '{ __type(name: "Query") { fields { name } } }' })
      });
      if (introspectResp.ok) {
        const introspectJson = await introspectResp.json() as any;
        const fields: string[] = (introspectJson?.data?.__type?.fields || []).map((f: any) => f.name);
        if (!fields.includes("pools")) {
          console.error(`Curve subgraph at ${subgraphUrl} does not expose a 'pools' query; skipping Curve discovery.`);
          return [];
        }
      }
    } catch (ie) {
      // If introspection fails, fallthrough to the main request and handle errors normally.
    }
    const response = await fetch(subgraphUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query })
    });
    if (!response.ok) {
      console.error(`Curve subgraph HTTP ${response.status} at ${subgraphUrl}`);
      return [];
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.error(`Curve subgraph returned non-JSON content-type: ${contentType}`);
      return [];
    }
    const json = await response.json() as any;
    
    if (json.errors) {
      const msgs = json.errors.map((e: any) => e?.message || "");
      const authErr = msgs.some((m: string) => /auth/i.test(m));
      if (authErr) {
        console.error(`GraphQL auth error for Curve subgraph. Set GRAPH_API_KEY or fix header. messages=`, json.errors);
      } else {
        console.error("GraphQL errors:", json.errors);
      }
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
