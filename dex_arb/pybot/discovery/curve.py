import requests
from typing import List, Dict

def top_pools(subgraph_url: str, min_tvl_usd: float = 100_000) -> List[Dict]:
    """Fetch top Curve pools by TVL from subgraph."""
    query = """
    { 
        pools(first: 200, orderBy: totalValueLockedUSD, orderDirection: desc) {
            id 
            totalValueLockedUSD 
            coins { 
                address 
                symbol 
                decimals 
                index 
            }
        }
    }"""
    
    try:
        response = requests.post(subgraph_url, json={"query": query}, timeout=20)
        response.raise_for_status()
        pools = response.json()["data"]["pools"]
        return [p for p in pools if float(p["totalValueLockedUSD"]) >= min_tvl_usd]
    except Exception as e:
        print(f"Error fetching Curve pools: {e}")
        return []
