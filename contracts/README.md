# DEX Arbitrage Bot - Foundry Project

This directory contains the Solidity smart contracts for the DEX arbitrage bot.

## Contracts

- **ArbExecutor.sol**: Main execution contract that handles arbitrage routes
- **libs/**: Interface libraries for external protocols
  - **Permit2.sol**: Uniswap Permit2 interface for gasless approvals
  - **UniswapV3.sol**: Uniswap V3 router and quoter interfaces
  - **CurveLike.sol**: Curve pool interfaces
  - **AaveV3.sol**: Aave V3 flash loan interfaces
  - **SafeTransferLib.sol**: Safe token transfer utilities

## Testing

Run tests with:
```bash
forge test
```

Run tests with verbose output:
```bash
forge test -vvv
```

## Deployment

Deploy to Base:
```bash
# Set CHAIN environment variable (optional, defaults to "base")
export CHAIN=base

# Deploy with fork-url (required when using --rpc-url)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_RPC \
  --fork-url $BASE_RPC \
  --private-key $SEARCHER_PK \
  --broadcast
```

Deploy to Arbitrum:
```bash
# Set CHAIN environment variable
export CHAIN=arbitrum

# Deploy with fork-url (required when using --rpc-url)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $ARB_RPC \
  --fork-url $ARB_RPC \
  --private-key $SEARCHER_PK \
  --broadcast
```

**Note**: When deploying to a live network, you need to provide both `--rpc-url` and `--fork-url` with the same value. The `--fork-url` tells Foundry to fork from that RPC endpoint for simulation purposes, while `--rpc-url` is used for the actual broadcast.

## Verification

Verify contracts on block explorers:
```bash
forge verify-contract --chain-id 8453 --num-of-optimizations 200 --watch --constructor-args $(cast abi-encode "constructor(address,address)" $PERMIT2 $AAVE_POOL) $CONTRACT_ADDRESS ArbExecutor
```

## Security

- All contracts use OpenZeppelin libraries
- Comprehensive test coverage
- Gas optimization enabled
- Access control implemented
