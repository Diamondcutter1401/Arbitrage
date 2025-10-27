from decimal import Decimal
from typing import Union

def normalize_amount(amount: Union[int, str], decimals: int) -> Decimal:
    """Normalize token amount to decimal representation."""
    return Decimal(amount) / Decimal(10 ** decimals)

def denormalize_amount(amount: Union[float, Decimal], decimals: int) -> int:
    """Convert decimal amount to wei/smallest unit."""
    return int(Decimal(str(amount)) * Decimal(10 ** decimals))

def format_amount(amount: Union[int, str], decimals: int, precision: int = 6) -> str:
    """Format amount for display."""
    normalized = normalize_amount(amount, decimals)
    return f"{normalized:.{precision}f}"
