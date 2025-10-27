from web3 import Web3
from typing import Union

# Curve get_dy ABI
GET_DY_ABI = [{
    "inputs": [
        {"internalType": "int128", "name": "i", "type": "int128"},
        {"internalType": "int128", "name": "j", "type": "int128"},
        {"internalType": "uint256", "name": "dx", "type": "uint256"}
    ],
    "name": "get_dy",
    "outputs": [{"internalType": "uint256", "name": "dy", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
}]

# Curve get_dy_underlying ABI (for meta pools)
GET_DY_UNDERLYING_ABI = [{
    "inputs": [
        {"internalType": "int128", "name": "i", "type": "int128"},
        {"internalType": "int128", "name": "j", "type": "int128"},
        {"internalType": "uint256", "name": "dx", "type": "uint256"}
    ],
    "name": "get_dy_underlying",
    "outputs": [{"internalType": "uint256", "name": "dy", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
}]

def get_dy(w3: Web3, pool: str, i: int, j: int, dx: int, underlying: bool = False) -> int:
    """Get Curve pool quote for token swap."""
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(pool), 
        abi=GET_DY_UNDERLYING_ABI if underlying else GET_DY_ABI
    )
    
    if underlying:
        return contract.functions.get_dy_underlying(i, j, dx).call()
    else:
        return contract.functions.get_dy(i, j, dx).call()
