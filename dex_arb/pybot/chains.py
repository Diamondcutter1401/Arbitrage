from web3 import Web3
from typing import Dict

def make_w3(rpc_url: str) -> Web3:
    """Create Web3 instance with timeout configuration."""
    w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 30}))
    if not w3.is_connected():
        raise RuntimeError(f"Cannot connect RPC {rpc_url}")
    return w3

def make_clients(cfg_chains: Dict):
    """Create Web3 clients for all configured chains."""
    clients = {}
    for name, data in cfg_chains.items():
        clients[name] = {
            "w3": make_w3(data["rpc"]),
            "cfg": data
        }
    return clients
