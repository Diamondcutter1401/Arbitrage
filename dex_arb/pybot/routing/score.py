from typing import List, Dict

def allowed(route: List[Dict], min_tvl_usd: float = 100_000, 
           max_hops: int = 3, deny_exotic: bool = True) -> bool:
    """Check if a route meets basic filtering criteria."""
    if len(route) > max_hops:
        return False
    
    if any(leg["tvl_usd"] < min_tvl_usd for leg in route):
        return False
    
    if deny_exotic and any(leg.get("exotic", False) for leg in route):
        return False
    
    return True

def required_profit_usd(gas_usd: float, flash_fee_usd: float, 
                       floor_usd: float = 0.01) -> float:
    """Calculate minimum required profit to cover costs."""
    return max(floor_usd, gas_usd + flash_fee_usd)

def calculate_profit_usd(amount_in_usd: float, amount_out_usd: float,
                        gas_usd: float, flash_fee_usd: float) -> float:
    """Calculate net profit after costs."""
    gross_profit = amount_out_usd - amount_in_usd
    total_costs = gas_usd + flash_fee_usd
    return gross_profit - total_costs
