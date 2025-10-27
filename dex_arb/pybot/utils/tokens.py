from typing import Dict, List, Optional
from web3 import Web3

# Common token addresses by chain
TOKEN_ADDRESSES = {
    'base': {
        'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        'USDT': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        'DAI': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        'WETH': '0x4200000000000000000000000000000000000006',
    },
    'arbitrum': {
        'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        'DAI': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        'WETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    }
}

def get_token_address(chain: str, symbol: str) -> Optional[str]:
    """Get token address by chain and symbol."""
    return TOKEN_ADDRESSES.get(chain, {}).get(symbol)

def get_token_symbol(chain: str, address: str) -> Optional[str]:
    """Get token symbol by chain and address."""
    chain_tokens = TOKEN_ADDRESSES.get(chain, {})
    for symbol, addr in chain_tokens.items():
        if addr.lower() == address.lower():
            return symbol
    return None

def is_stablecoin(symbol: str) -> bool:
    """Check if token is a stablecoin."""
    stablecoins = {'USDC', 'USDT', 'DAI', 'USDD', 'FRAX', 'LUSD'}
    return symbol in stablecoins

def get_token_decimals(symbol: str) -> int:
    """Get standard decimals for common tokens."""
    decimals_map = {
        'USDC': 6,
        'USDT': 6,
        'DAI': 18,
        'WETH': 18,
        'USDD': 18,
        'FRAX': 18,
        'LUSD': 18,
    }
    return decimals_map.get(symbol, 18)  # Default to 18
