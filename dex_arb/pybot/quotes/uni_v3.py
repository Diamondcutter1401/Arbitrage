from web3 import Web3
from eth_abi import encode
from typing import List

# QuoterV2 ABI for quoteExactInput
QUOTER_ABI = [{
    "inputs": [
        {"internalType": "bytes", "name": "path", "type": "bytes"},
        {"internalType": "uint256", "name": "amountIn", "type": "uint256"}
    ],
    "name": "quoteExactInput",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
}]

def encode_path(tokens: List[str], fees_bps: List[int]) -> bytes:
    """Encode token path with fees for Uniswap v3 routing."""
    # Format: address (20) + uint24 fee + address ... (same as Solidity)
    assert len(tokens) == len(fees_bps) + 1
    path_bytes = b""
    
    for i, fee in enumerate(fees_bps):
        # Add token address (20 bytes)
        path_bytes += Web3.to_bytes(hexstr=tokens[i])
        # Add fee (3 bytes, big endian)
        path_bytes += int(fee * 100).to_bytes(3, "big")
        # Add next token address (20 bytes)
        path_bytes += Web3.to_bytes(hexstr=tokens[i + 1])
    
    return path_bytes

def quote_exact_in(w3: Web3, quoter: str, path: bytes, amount_in_wei: int) -> int:
    """Get exact input quote from Uniswap v3 QuoterV2."""
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(quoter), 
        abi=QUOTER_ABI
    )
    return contract.functions.quoteExactInput(path, amount_in_wei).call()
