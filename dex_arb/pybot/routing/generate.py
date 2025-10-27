from typing import Iterable, Dict, Generator, List

# A leg represents a single swap operation
# Format: {"dex": "uni_v3"/"curve", "addr": pool_address, "data": bytes, 
#          "token_in": address, "token_out": address, "tvl_usd": float}
Leg = Dict

def gen_two_three_legs(legs: Iterable[Leg]) -> Generator[List[Leg], None, None]:
    """Generate 2-leg and 3-leg arbitrage routes from available legs."""
    legs_list = list(legs)
    
    # Generate 2-leg routes
    for leg_a in legs_list:
        for leg_b in legs_list:
            # Check if legs can be chained: A output -> B input
            if (leg_a["token_out"] == leg_b["token_in"] and 
                leg_a["token_in"] != leg_b["token_out"]):
                yield [leg_a, leg_b]
    
    # Generate 3-leg routes (triangular arbitrage)
    for leg_a in legs_list:
        for leg_b in legs_list:
            for leg_c in legs_list:
                # Check if legs form a triangle: A -> B -> C -> A
                if (leg_a["token_out"] == leg_b["token_in"] and 
                    leg_b["token_out"] == leg_c["token_in"] and 
                    leg_c["token_out"] == leg_a["token_in"]):
                    yield [leg_a, leg_b, leg_c]
