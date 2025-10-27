from eth_abi import encode
from eth_utils import to_checksum_address
from typing import List, Dict

# Mirror Solidity structs
# Hop: (uint8 dex, address routerOrPool, bytes data, address tokenIn, address tokenOut)
# Route: (Hop[] hops, address inputToken, address outputToken)

def encode_hop(hop: Dict) -> tuple:
    """Encode a single hop for ArbExecutor."""
    dex_id = 1 if hop["dex"] == "uni_v3" else 2  # 1=UniV3, 2=Curve
    return (
        dex_id,
        to_checksum_address(hop["addr"]),
        hop["data"],
        to_checksum_address(hop["token_in"]),
        to_checksum_address(hop["token_out"])
    )

def encode_route(route_legs: List[Dict], input_token: str, output_token: str) -> bytes:
    """Encode complete route for ArbExecutor.execute."""
    hops = [encode_hop(hop) for hop in route_legs]
    
    # ABI: ( (uint8,address,bytes,address,address)[], address, address )
    return encode(
        ["(uint8,address,bytes,address,address)[]", "address", "address"],
        [hops, to_checksum_address(input_token), to_checksum_address(output_token)]
    )

def encode_execute_call(route_bytes: bytes, amount_in: int, min_return: int, deadline: int) -> bytes:
    """Encode ArbExecutor.execute call."""
    # Function selector for execute((Hop[],address,address),uint256,uint256,uint256)
    function_selector = b'\x12\x34\x56\x78'  # Replace with actual selector
    
    return function_selector + encode(
        ["bytes", "uint256", "uint256", "uint256"],
        [route_bytes, amount_in, min_return, deadline]
    )

def encode_flashloan_call(route_bytes: bytes, amount_in: int, min_return: int, 
                         deadline: int, flashloan_amount: int) -> bytes:
    """Encode ArbExecutor.executeWithFlashloan call."""
    # Function selector for executeWithFlashloan((Hop[],address,address),uint256,uint256,uint256,uint256)
    function_selector = b'\x87\x65\x43\x21'  # Replace with actual selector
    
    return function_selector + encode(
        ["bytes", "uint256", "uint256", "uint256", "uint256"],
        [route_bytes, amount_in, min_return, deadline, flashloan_amount]
    )
