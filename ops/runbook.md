# DEX Arbitrage Bot Runbook

## Overview
This runbook provides step-by-step instructions for setting up, deploying, and operating the DEX arbitrage bot for Base and Arbitrum networks.

## Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- PostgreSQL client (optional, for database management)
- Access to Base and Arbitrum RPC endpoints
- Private keys for transaction signing
- Private transaction RPC endpoints (optional, for MEV protection)

## Installation

### 1. Clone and Setup
```bash
git clone <repository-url>
cd dex-arb
```

### 2. Database Setup
```bash
# Start PostgreSQL database
cd ops
docker compose up -d db

# Wait for database to be ready
docker compose logs db

# Verify database is running
docker compose exec db psql -U arb -d arb -c "SELECT version();"
```

### 3. Environment Configuration
```bash
# Copy environment template
cp ops/env.example ops/.env

# Edit .env file with your actual values
nano ops/.env
```

Required environment variables:
- `BASE_RPC`: Base network RPC URL
- `ARB_RPC`: Arbitrum network RPC URL
- `SEARCHER_PK`: Private key for transaction signing
- `EXECUTOR_CONTRACT`: Deployed ArbExecutor contract address

Optional environment variables:
- `BASE_PRIVATE_TX_RPC`: Private transaction RPC for Base
- `ARB_PRIVATE_TX_RPC`: Private transaction RPC for Arbitrum

## Contract Deployment

### 1. Compile Contracts
```bash
cd contracts
forge build
```

### 2. Deploy ArbExecutor
```bash
# Deploy to Base (example)
forge script script/Deploy.s.sol:DeployScript --rpc-url $BASE_RPC --private-key $SEARCHER_PK --broadcast

# Deploy to Arbitrum (example)
forge script script/Deploy.s.sol:DeployScript --rpc-url $ARB_RPC --private-key $SEARCHER_PK --broadcast
```

### 3. Update Configuration
After deployment, update the contract addresses in:
- `bot/config/chains.json`
- `ops/.env` (EXECUTOR_CONTRACT)

## Bot Operation

### 1. Start the Bot
```bash
# Using Docker Compose (recommended)
cd ops
docker compose up -d

# Or run locally for development
cd bot
npm install
npm run build
npm start
```

### 2. Monitor Bot Status
```bash
# View logs
docker compose logs -f bot

# Check health status
docker compose ps

# View database
docker compose exec db psql -U arb -d arb
```

### 3. Bot Commands
```bash
# Discover pools
npm run discover:base
npm run discover:arb

# Run backtest
npm run backtest

# Backfill historical data
npm run backfill
```

## Monitoring and Alerting

### 1. Database Queries
```sql
-- Check recent profitable quotes
SELECT * FROM quotes 
WHERE profit_usd > 0.01 
ORDER BY ts DESC 
LIMIT 10;

-- Check execution success rate
SELECT 
  status,
  COUNT(*) as count,
  AVG(profit_usd) as avg_profit
FROM executions 
WHERE ts > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Monitor gas prices
SELECT 
  chain,
  AVG(gas_price_gwei) as avg_gas_price,
  MAX(gas_price_gwei) as max_gas_price
FROM gas_prices 
WHERE ts > NOW() - INTERVAL '1 hour'
GROUP BY chain;
```

### 2. Metrics and Alerts
The bot exposes Prometheus metrics on port 9090:
- `executions_total`: Total number of executions
- `profit_usd`: Profit per execution
- `gas_price_gwei`: Current gas prices
- `route_quotes_total`: Total route quotes generated

### 3. Risk Management
The bot includes automatic risk management:
- **Gas Price Protection**: Pauses when gas prices exceed 90th percentile
- **Failure Rate Protection**: Pauses when failure rate exceeds 20%
- **Slippage Protection**: Maximum 5% slippage per leg
- **Profit Floor**: Minimum $0.01 profit required

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   docker compose exec db pg_isready -U arb -d arb
   
   # Restart database
   docker compose restart db
   ```

2. **RPC Connection Issues**
   - Verify RPC URLs are correct and accessible
   - Check rate limits on RPC providers
   - Consider using multiple RPC endpoints

3. **Transaction Failures**
   - Check gas price settings
   - Verify contract addresses
   - Review slippage settings
   - Check token approvals

4. **Low Profitability**
   - Adjust `profitFloorUsd` in strategy config
   - Review gas price limits
   - Check DEX pool liquidity
   - Verify quote accuracy

### Log Analysis
```bash
# View recent errors
docker compose logs bot | grep ERROR

# Monitor execution attempts
docker compose logs bot | grep "Executed route"

# Check quote generation
docker compose logs bot | grep "profitable routes"
```

## Maintenance

### 1. Regular Tasks
- Monitor database size and performance
- Update RPC endpoints if needed
- Review and update denylist
- Check contract upgrades

### 2. Database Maintenance
```sql
-- Clean old data (keep last 30 days)
DELETE FROM quotes WHERE ts < NOW() - INTERVAL '30 days';
DELETE FROM executions WHERE ts < NOW() - INTERVAL '30 days';
DELETE FROM gas_prices WHERE ts < NOW() - INTERVAL '7 days';

-- Analyze table statistics
ANALYZE quotes;
ANALYZE executions;
ANALYZE pools;
```

### 3. Performance Optimization
- Monitor query performance
- Add indexes for new query patterns
- Optimize route generation algorithms
- Review gas price strategies

## Security Considerations

1. **Private Key Management**
   - Use hardware wallets for production
   - Implement key rotation
   - Monitor for unauthorized transactions

2. **Contract Security**
   - Regular security audits
   - Monitor for contract upgrades
   - Implement emergency pause mechanisms

3. **Network Security**
   - Use private RPC endpoints
   - Implement rate limiting
   - Monitor for suspicious activity

## Emergency Procedures

### 1. Bot Pause
```bash
# Stop the bot
docker compose stop bot

# Or pause via environment variable
echo "PAUSED=true" >> ops/.env
docker compose restart bot
```

### 2. Emergency Withdrawal
```bash
# Use rescue function in contract
cast send $EXECUTOR_CONTRACT "rescue(address,uint256)" $TOKEN_ADDRESS $AMOUNT --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

### 3. Database Recovery
```bash
# Backup database
docker compose exec db pg_dump -U arb arb > backup.sql

# Restore database
docker compose exec -T db psql -U arb arb < backup.sql
```

## Support and Updates

- Monitor GitHub repository for updates
- Join community Discord for support
- Review documentation for new features
- Test updates in staging environment first
