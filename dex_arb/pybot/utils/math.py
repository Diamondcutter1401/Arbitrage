from decimal import Decimal, ROUND_DOWN
from typing import Union

def calculate_slippage(amount_in: Union[int, Decimal], 
                      amount_out: Union[int, Decimal],
                      expected_out: Union[int, Decimal]) -> float:
    """Calculate slippage percentage."""
    if expected_out == 0:
        return 0.0
    
    slippage = (Decimal(expected_out) - Decimal(amount_out)) / Decimal(expected_out)
    return float(slippage * 100)

def apply_slippage(amount: Union[int, Decimal], slippage_bps: int) -> int:
    """Apply slippage to amount (in basis points)."""
    slippage_decimal = Decimal(slippage_bps) / Decimal(10000)
    adjusted = Decimal(amount) * (Decimal(1) - slippage_decimal)
    return int(adjusted)

def calculate_min_return(amount_out: Union[int, Decimal], 
                        slippage_bps: int) -> int:
    """Calculate minimum return with slippage."""
    return apply_slippage(amount_out, slippage_bps)

def calculate_profit_margin(amount_in: Union[int, Decimal],
                           amount_out: Union[int, Decimal],
                           costs: Union[int, Decimal]) -> float:
    """Calculate profit margin percentage."""
    if amount_in == 0:
        return 0.0
    
    profit = Decimal(amount_out) - Decimal(amount_in) - Decimal(costs)
    margin = profit / Decimal(amount_in)
    return float(margin * 100)

def round_down(amount: Union[int, Decimal], decimals: int) -> int:
    """Round down amount to specified decimals."""
    decimal_amount = Decimal(amount)
    multiplier = Decimal(10 ** decimals)
    return int((decimal_amount * multiplier).quantize(Decimal('1'), rounding=ROUND_DOWN))
