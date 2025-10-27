# Arbitrage Bot Documentation

## Overview

This arbitrage bot discovers and executes profitable trades across multiple decentralized exchanges (DEXes) on EVM-compatible chains. It supports Base, Arbitrum, and can be extended to other chains.

## Core Components

### 1. Discovery Module (`pybot/discovery/`)

Discovers trading pools from subgraphs:
- **Uniswap v3**: Uses The Graph subgraphs for pool discovery
- **Curve**: Uses Curve's subgraph for stablecoin pools
- Filters by TVL and other criteria

### 2. Quotes Module (`pybot/quotes/`)

Gets real-time prices from DEXes:
- **Uniswap v3**: QuoterV2 integration for exact input quotes
- **Curve**: get_dy and get_dy_underlying for stablecoin swaps
- Handles path encoding and fee calculations

### 3. Routing Module (`pybot/routing/`)

Generates and scores arbitrage routes:
- **2-leg routes**: Direct arbitrage between two pools
- **3-leg routes**: Triangular arbitrage through three pools
- **Scoring**: TVL filters, profit calculations, risk assessment

### 4. Execution Module (`pybot/exec/`)

Handles transaction execution:
- **Calldata encoding**: ABI encoding for ArbExecutor contract
- **Private transactions**: MEV protection via private mempools
- **Simulation**: Pre-flight transaction simulation
- **Gas management**: Dynamic gas pricing and replacement

### 5. State Management (`pybot/state/`)

Manages bot state:
- **Pool cache**: In-memory cache with periodic refresh
- **Event listeners**: WebSocket listeners for pool updates
- **Thread safety**: Concurrent access protection

### 6. Database (`pybot/db/`)

PostgreSQL integration:
- **Models**: SQLAlchemy models for quotes, transactions, pools
- **Async operations**: Non-blocking database writes
- **Schema**: Optimized schema with proper indexing

## Configuration

### Environment Variables

Required environment variables in `.env`:

```bash
# RPC URLs
BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ARB_RPC=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY

# Bot configuration
SEARCHER_PK=0xYOUR_PRIVATE_KEY
EXECUTOR_CONTRACT=0xYOUR_DEPLOYED_CONTRACT

# Database
PGHOST=db
PGUSER=arb
PGPASSWORD=arb
PGDATABASE=arb
```

### Chain Configuration

Each chain requires:
- RPC endpoint
- Private transaction RPC (optional)
- Aave v3 pool address
- Permit2 address
- DEX-specific addresses (routers, quoters)

### Strategy Configuration

Key parameters:
- `max_hops`: Maximum route length (default: 3)
- `min_tvl_usd`: Minimum pool TVL (default: $100k)
- `profit_floor_usd`: Minimum profit threshold (default: $0.01)
- `slippage_bps_per_leg`: Slippage tolerance per hop (default: 5 bps)

## Smart Contract

### ArbExecutor.sol

The main execution contract:
- **execute()**: Execute with own funds
- **executeWithFlashloan()**: Execute with Aave flashloan
- **executeOperation()**: Aave flashloan callback
- **Multi-DEX support**: Uniswap v3 and Curve integration

### Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Admin functions protected
- **SafeERC20**: Safe token transfers
- **Deadline checks**: Transaction deadline validation

## Database Schema

### Core Tables

1. **quotes**: Arbitrage opportunities
   - Chain, amounts, profit calculations
   - Route legs (JSONB)
   - Timestamps

2. **transactions**: Execution records
   - Transaction hash, status
   - Gas usage, profit
   - Route information

3. **pools**: Pool cache
   - Chain, DEX, address
   - Token pairs, TVL
   - Last updated

4. **risk_limits**: Risk management
   - Position limits per chain
   - Daily loss limits
   - Reset periods

## Deployment

### Docker Setup

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f bot

# Scale bot instances
docker-compose up -d --scale bot=3
```

### Manual Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Setup database
psql -U arb -d arb -f sql/schema.sql
psql -U arb -d arb -f sql/indexes.sql

# Run bot
python -m pybot.main
```

## Monitoring

### Key Metrics

- **Quote Discovery Rate**: Opportunities found per minute
- **Execution Success Rate**: Successful transactions percentage
- **Average Profit**: Mean profit per successful trade
- **Gas Efficiency**: Gas cost per dollar of profit

### Health Checks

- **RPC Connectivity**: All chain connections healthy
- **Database Connectivity**: PostgreSQL accessible
- **Contract Deployment**: ArbExecutor deployed and accessible
- **Private Key**: Valid signing key available

## Risk Management

### Position Limits

- Maximum position size per chain
- Maximum daily loss threshold
- Maximum gas price limits

### Pool Filtering

- Minimum TVL requirements
- Exotic token filtering
- Fee-on-transfer token exclusion

### Execution Safety

- Slippage protection
- Deadline enforcement
- Minimum return validation

## Performance Tuning

### Optimization Strategies

1. **Pool Caching**: Reduce subgraph queries
2. **Parallel Discovery**: Concurrent chain queries
3. **Database Indexing**: Optimize query performance
4. **Connection Pooling**: Efficient database connections

### Scaling Considerations

- **Horizontal Scaling**: Multiple bot instances
- **Load Balancing**: Distribute across chains
- **Resource Limits**: CPU, memory, network

## Troubleshooting

### Common Issues

1. **RPC Rate Limits**: Implement backoff strategies
2. **Database Locks**: Optimize query patterns
3. **Contract Failures**: Improve error handling
4. **Network Issues**: Implement retry logic

### Debug Tools

- **Logging**: Structured logging with different levels
- **Metrics**: Prometheus metrics for monitoring
- **Database Queries**: Direct SQL for debugging
- **Transaction Tracing**: Detailed execution logs

## Security Best Practices

1. **Private Key Management**: Use hardware wallets or secure key management
2. **Network Security**: VPN or private networks for production
3. **Access Control**: Limit database and RPC access
4. **Audit Trail**: Comprehensive logging of all operations
5. **Regular Updates**: Keep dependencies and contracts updated

## Future Enhancements

- **Additional Chains**: IMX, Metis, Polygon
- **More DEXes**: SushiSwap, Balancer, Bancor
- **Advanced Strategies**: Cross-chain arbitrage
- **Machine Learning**: Predictive pricing models
- **API Integration**: REST API for external access
