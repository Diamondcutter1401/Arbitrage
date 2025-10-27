import os
import time
import math
from decimal import Decimal
from web3 import Web3
from pybot.cfg import load_config
from pybot.chains import make_clients
from pybot.discovery import uni_v3 as d_uni, curve as d_curve
from pybot.quotes import uni_v3 as q_uni, curve as q_curve
from pybot.routing.generate import gen_two_three_legs
from pybot.routing.score import allowed, required_profit_usd, calculate_profit_usd
from pybot.exec.calldata import encode_route, encode_execute_call, encode_flashloan_call
from pybot.exec.private_tx import send_private_or_public
from pybot.exec.simulate import estimate_gas, get_gas_price, calculate_gas_cost_usd
from pybot.utils.tokens import get_token_decimals, is_stablecoin
from pybot.utils.math import calculate_min_return
from eth_abi import encode as abi_encode

# Environment variables
ARB_EXECUTOR = os.environ.get("EXECUTOR_CONTRACT")  # deployed ArbExecutor address
SEARCHER_PK = os.environ.get("SEARCHER_PK")

def usd_to_amount(decimals: int, usd: float, price_usd: float = 1.0) -> int:
    """Convert USD amount to token amount."""
    return int(Decimal(usd) / Decimal(price_usd) * (10 ** decimals))

def main():
    """Main arbitrage bot orchestrator."""
    cfg = load_config()
    clients = make_clients(cfg.chains)

    print("Starting arbitrage bot...")
    print(f"Configured chains: {list(cfg.chains.keys())}")

    # 1) DISCOVERY (Base + Arbitrum)
    legs = []
    for chain_name in ["base", "arbitrum"]:
        if chain_name not in clients:
            continue
            
        chain = clients[chain_name]
        print(f"Discovering pools on {chain_name}...")
        
        # Uniswap v3 pools
        try:
            uni_pools = d_uni.top_pools(
                cfg.chains[chain_name]["univ3"]["subgraph"], 
                cfg.strategy["limits"]["min_tvl_usd"]
            )
            print(f"Found {len(uni_pools)} Uni v3 pools on {chain_name}")
            
            for pool in uni_pools:
                # Build 1-hop legs template
                legs.append({
                    "chain": chain_name,
                    "dex": "uni_v3",
                    "addr": cfg.chains[chain_name]["univ3"]["router"],
                    "data": b"",  # filled at quote time
                    "token_in": pool["token0"]["id"],
                    "token_out": pool["token1"]["id"],
                    "tvl_usd": float(pool["totalValueLockedUSD"]),
                    "fee_tier": int(pool["feeTier"])
                })
                legs.append({
                    "chain": chain_name,
                    "dex": "uni_v3",
                    "addr": cfg.chains[chain_name]["univ3"]["router"],
                    "data": b"",
                    "token_in": pool["token1"]["id"],
                    "token_out": pool["token0"]["id"],
                    "tvl_usd": float(pool["totalValueLockedUSD"]),
                    "fee_tier": int(pool["feeTier"])
                })
        except Exception as e:
            print(f"Error discovering Uni v3 pools on {chain_name}: {e}")
        
        # Curve pools
        try:
            curve_pools = d_curve.top_pools(
                cfg.chains[chain_name]["curve"]["subgraph"], 
                cfg.strategy["limits"]["min_tvl_usd"]
            )
            print(f"Found {len(curve_pools)} Curve pools on {chain_name}")
            
            for pool in curve_pools:
                # Placeholder for Curve legs (would need coin index mapping)
                pass
        except Exception as e:
            print(f"Error discovering Curve pools on {chain_name}: {e}")

    print(f"Total legs discovered: {len(legs)}")

    # 2) GENERATE CANDIDATE ROUTES
    candidates = []
    for route in gen_two_three_legs(legs):
        if not allowed(route,
                      min_tvl_usd=cfg.strategy["limits"]["min_tvl_usd"],
                      max_hops=cfg.strategy["limits"]["max_hops"],
                      deny_exotic=cfg.strategy["limits"]["deny_fee_on_transfer"]):
            continue
        candidates.append(route)

    print(f"Generated {len(candidates)} candidate routes")

    # 3) QUOTE + SCORE (simplified demo)
    profitable_routes = []
    
    for route in candidates[:10]:  # Limit to first 10 for demo
        try:
            # Get chain for this route
            chain_name = route[0]["chain"]
            chain_client = clients[chain_name]
            w3 = chain_client["w3"]
            
            # Test with first size from config
            test_size_usd = cfg.strategy["sizes_usd"][0]
            
            # Convert to token amount (simplified - assume USDC)
            input_token = route[0]["token_in"]
            input_decimals = get_token_decimals("USDC")  # Simplified
            amount_in = usd_to_amount(input_decimals, test_size_usd)
            
            # Build path and quote
            if route[0]["dex"] == "uni_v3":
                # Encode path for Uni v3
                tokens = [route[0]["token_in"], route[0]["token_out"]]
                fees = [route[0]["fee_tier"]]
                path = q_uni.encode_path(tokens, fees)
                
                # Quote
                quoter = cfg.chains[chain_name]["univ3"]["quoter_v2"]
                amount_out = q_uni.quote_exact_in(w3, quoter, path, amount_in)
                
                # Calculate profit
                amount_in_usd = test_size_usd
                amount_out_usd = amount_out / (10 ** get_token_decimals("USDC"))
                
                # Estimate gas
                gas_price = get_gas_price(w3)
                gas_limit = 200000  # Simplified estimate
                gas_cost_usd = calculate_gas_cost_usd(gas_limit, gas_price, 1.0)  # Assume $1 ETH
                
                # Flash loan fee
                flash_fee_usd = test_size_usd * cfg.strategy["flashloan"]["fee_pct"]
                
                # Calculate profit
                profit_usd = calculate_profit_usd(
                    amount_in_usd, amount_out_usd, gas_cost_usd, flash_fee_usd
                )
                
                required_profit = required_profit_usd(
                    gas_cost_usd, flash_fee_usd, cfg.strategy["profit"]["profit_floor_usd"]
                )
                
                if profit_usd > required_profit:
                    profitable_routes.append({
                        "route": route,
                        "profit_usd": profit_usd,
                        "amount_in_usd": amount_in_usd,
                        "amount_out_usd": amount_out_usd,
                        "gas_cost_usd": gas_cost_usd
                    })
                    
        except Exception as e:
            print(f"Error quoting route: {e}")
            continue

    print(f"Found {len(profitable_routes)} profitable routes")
    
    # 4) EXECUTE PROFITABLE ROUTES (simplified demo)
    for route_data in profitable_routes[:3]:  # Limit to first 3 for demo
        route = route_data["route"]
        profit_usd = route_data["profit_usd"]
        
        print(f"Executing route with profit: ${profit_usd:.4f}")
        
        # In a real implementation, you would:
        # 1. Build the complete calldata
        # 2. Sign the transaction
        # 3. Send via private mempool
        # 4. Monitor for success/failure
        
        # Example calldata building (commented out for demo)
        # route_bytes = encode_route(route, route[0]["token_in"], route[-1]["token_out"])
        # amount_in = usd_to_amount(input_decimals, test_size_usd)
        # min_return = calculate_min_return(amount_out, cfg.strategy["profit"]["slippage_bps_per_leg"])
        # deadline = int(time.time()) + 300  # 5 minutes
        # 
        # if cfg.strategy["flashloan"]["enabled"]:
        #     calldata = encode_flashloan_call(route_bytes, amount_in, min_return, deadline, amount_in)
        # else:
        #     calldata = encode_execute_call(route_bytes, amount_in, min_return, deadline)
        # 
        # # Sign and send transaction
        # # tx_hash = send_private_or_public(w3, signed_tx, cfg.chains[chain_name]["private_tx_rpc"])

if __name__ == "__main__":
    main()
