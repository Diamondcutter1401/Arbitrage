import time
from typing import List, Dict, Any
from web3 import Web3

class BlockReplay:
    """Simple block replay harness for backtesting."""
    
    def __init__(self, w3: Web3):
        self.w3 = w3
    
    def replay_block(self, block_number: int) -> Dict[str, Any]:
        """Replay a specific block and extract relevant data."""
        try:
            block = self.w3.eth.get_block(block_number, full_transactions=True)
            
            # Extract swap transactions
            swaps = []
            for tx in block.transactions:
                if self._is_swap_transaction(tx):
                    swaps.append({
                        'hash': tx.hash.hex(),
                        'from': tx['from'],
                        'to': tx['to'],
                        'value': tx['value'],
                        'gas_price': tx['gasPrice'],
                        'gas_used': tx.get('gasUsed', 0)
                    })
            
            return {
                'block_number': block_number,
                'timestamp': block.timestamp,
                'gas_used': block.gasUsed,
                'gas_limit': block.gasLimit,
                'base_fee': block.get('baseFeePerGas', 0),
                'swaps': swaps
            }
        except Exception as e:
            print(f"Error replaying block {block_number}: {e}")
            return {}
    
    def _is_swap_transaction(self, tx) -> bool:
        """Check if transaction is likely a swap."""
        # Simple heuristic: check if it's calling known DEX contracts
        dex_contracts = [
            # Add known DEX contract addresses here
        ]
        
        if tx['to'] in dex_contracts:
            return True
        
        # Check for swap function signatures
        if tx.get('input') and len(tx['input']) > 10:
            swap_signatures = [
                '0x38ed1739',  # swapExactTokensForTokens
                '0x7ff36ab5',  # swapExactETHForTokens
                '0x18cbafe5',  # swapExactTokensForETH
            ]
            return tx['input'][:10] in swap_signatures
        
        return False
    
    def replay_range(self, start_block: int, end_block: int, 
                    callback: callable = None) -> List[Dict[str, Any]]:
        """Replay a range of blocks."""
        results = []
        
        for block_num in range(start_block, end_block + 1):
            block_data = self.replay_block(block_num)
            if block_data:
                results.append(block_data)
                
                if callback:
                    callback(block_data)
            
            # Rate limiting
            time.sleep(0.1)
        
        return results
