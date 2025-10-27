import time
from typing import Dict, List, Optional
from threading import Lock

class PoolCache:
    """In-memory cache for pool data with periodic refresh."""
    
    def __init__(self, refresh_interval: int = 300):  # 5 minutes
        self.refresh_interval = refresh_interval
        self.last_refresh = 0
        self.pools: Dict[str, List[Dict]] = {}
        self.lock = Lock()
    
    def get_pools(self, chain: str, dex: str) -> List[Dict]:
        """Get cached pools for chain/dex combination."""
        with self.lock:
            key = f"{chain}_{dex}"
            return self.pools.get(key, [])
    
    def update_pools(self, chain: str, dex: str, pools: List[Dict]):
        """Update cached pools."""
        with self.lock:
            key = f"{chain}_{dex}"
            self.pools[key] = pools
            self.last_refresh = time.time()
    
    def needs_refresh(self) -> bool:
        """Check if cache needs refresh."""
        return time.time() - self.last_refresh > self.refresh_interval
    
    def clear(self):
        """Clear all cached data."""
        with self.lock:
            self.pools.clear()
            self.last_refresh = 0
