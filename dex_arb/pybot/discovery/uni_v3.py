import requests
from typing import List, Dict

def top_pools(subgraph_url: str, min_tvl_usd: float = 100_000) -> List[Dict]:
    """Fetch top Uniswap v3 pools by TVL from subgraph."""
    query = """
    { 
        pools(first: 200, orderBy: totalValueLockedUSD, orderDirection: desc) {
            id 
            feeTier 
            liquidity 
            totalValueLockedUSD
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
        }
    }"""
    
    try:
        response = requests.post(subgraph_url, json={"query": query}, timeout=20)
        response.raise_for_status()
        pools = response.json()["data"]["pools"]
        return [p for p in pools if float(p["totalValueLockedUSD"]) >= min_tvl_usd]
    except Exception as e:
        print(f"Error fetching Uni v3 pools: {e}")
        return []
