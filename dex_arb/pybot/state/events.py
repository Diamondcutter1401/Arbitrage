import asyncio
import json
from typing import Callable, Dict, Any
from web3 import Web3

class EventListener:
    """WebSocket event listener for pool updates."""
    
    def __init__(self, w3: Web3):
        self.w3 = w3
        self.subscriptions: Dict[str, Any] = {}
    
    async def listen_to_swaps(self, pool_address: str, callback: Callable):
        """Listen to Swap events from a pool."""
        # Uniswap v3 Swap event signature
        swap_topic = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
        
        try:
            # Subscribe to logs
            subscription = self.w3.eth.subscribe('logs', {
                'address': pool_address,
                'topics': [swap_topic]
            })
            
            self.subscriptions[pool_address] = subscription
            
            async for log in subscription:
                await callback(log)
                
        except Exception as e:
            print(f"Error listening to swaps for {pool_address}: {e}")
    
    async def listen_to_sync(self, pool_address: str, callback: Callable):
        """Listen to Sync events from a pool (Uniswap v2 style)."""
        # Sync event signature
        sync_topic = "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
        
        try:
            subscription = self.w3.eth.subscribe('logs', {
                'address': pool_address,
                'topics': [sync_topic]
            })
            
            self.subscriptions[f"{pool_address}_sync"] = subscription
            
            async for log in subscription:
                await callback(log)
                
        except Exception as e:
            print(f"Error listening to sync for {pool_address}: {e}")
    
    def stop_listening(self, pool_address: str):
        """Stop listening to events for a pool."""
        if pool_address in self.subscriptions:
            self.subscriptions[pool_address].unsubscribe()
            del self.subscriptions[pool_address]
    
    def stop_all(self):
        """Stop all event listeners."""
        for subscription in self.subscriptions.values():
            subscription.unsubscribe()
        self.subscriptions.clear()
