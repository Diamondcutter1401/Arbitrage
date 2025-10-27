from web3 import Web3
from typing import Optional, Dict, Any

def call_static(w3: Web3, to: str, data: bytes, from_addr: Optional[str] = None) -> bytes:
    """Simulate transaction execution."""
    tx = {"to": to, "data": data}
    if from_addr:
        tx["from"] = from_addr
    
    return w3.eth.call(tx)

def estimate_gas(w3: Web3, tx: Dict[str, Any]) -> int:
    """Estimate gas for transaction."""
    try:
        return w3.eth.estimate_gas(tx)
    except Exception as e:
        print(f"Gas estimation failed: {e}")
        return 0

def get_gas_price(w3: Web3) -> int:
    """Get current gas price."""
    try:
        return w3.eth.gas_price
    except Exception as e:
        print(f"Failed to get gas price: {e}")
        return 0

def calculate_gas_cost_usd(gas_limit: int, gas_price: int, eth_price_usd: float) -> float:
    """Calculate gas cost in USD."""
    gas_cost_wei = gas_limit * gas_price
    gas_cost_eth = gas_cost_wei / 1e18
    return gas_cost_eth * eth_price_usd
