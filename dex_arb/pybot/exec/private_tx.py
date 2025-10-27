import json
import time
import requests
from web3 import Web3
from typing import Optional

def send_private_or_public(w3: Web3, raw_tx: bytes, private_rpc: Optional[str]) -> str:
    """Send transaction via private mempool first, fallback to public."""
    raw_hex = "0x" + raw_tx.hex()
    
    if private_rpc:
        try:
            response = requests.post(private_rpc, json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "eth_sendPrivateTransaction",
                "params": [{"tx": raw_hex}]
            }, timeout=10)
            
            result = response.json()
            if "result" in result and isinstance(result["result"], str):
                return result["result"]
        except Exception as e:
            print(f"Private transaction failed: {e}")
    
    # Fallback to public mempool
    return w3.eth.send_raw_transaction(raw_tx).hex()

def bump_gas_price(w3: Web3, tx_hash: str, new_gas_price: int) -> Optional[str]:
    """Replace transaction with higher gas price."""
    try:
        # Get current transaction
        tx = w3.eth.get_transaction(tx_hash)
        
        # Create replacement transaction
        replacement_tx = tx.copy()
        replacement_tx['gasPrice'] = new_gas_price
        
        # Sign and send replacement
        return w3.eth.send_raw_transaction(replacement_tx).hex()
    except Exception as e:
        print(f"Gas bump failed: {e}")
        return None
