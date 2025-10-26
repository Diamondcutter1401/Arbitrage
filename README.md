# DEX Arbitrage Bot

A sophisticated arbitrage bot for Base and Arbitrum networks that discovers and executes profitable trades across Uniswap V3 and Curve pools using flash loans.

## Features

- **Multi-Chain Support**: Base and Arbitrum networks
- **Multi-DEX Integration**: Uniswap V3 and Curve pools
- **Flash Loan Integration**: Aave V3 flash loans for capital efficiency
- **Private Transaction Support**: MEV protection via private mempools
- **Risk Management**: Automatic pause conditions and slippage protection
- **Real-time Monitoring**: PostgreSQL database with comprehensive metrics
- **Docker Deployment**: Production-ready containerized deployment

## Architecture

### Smart Contracts
- **ArbExecutor**: Main execution contract with flash loan support
- **Permit2 Integration**: Gasless token approvals
- **Multi-hop Routing**: 2-leg and 3-leg arbitrage routes

### Bot Components
- **Discovery**: Real-time pool discovery via subgraphs
- **Quoting**: On-chain price quotes for route evaluation
- **Routing**: Intelligent route generation and scoring
- **Execution**: Private transaction submission with MEV protection
- **Risk Management**: Dynamic risk controls and kill switches

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- Access to Base and Arbitrum RPC endpoints
- Private keys for transaction signing

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dex-arb
   ```

2. **Set up environment**
   ```bash
   cd ops
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the database**
   ```bash
   docker compose up -d db
   ```

4. **Deploy contracts**
   ```bash
   cd contracts
   forge build
   forge script script/Deploy.s.sol:DeployScript --rpc-url $BASE_RPC --private-key $SEARCHER_PK --broadcast
   ```

5. **Start the bot**
   ```bash
   docker compose up -d
   ```

## Configuration

### Environment Variables
- `BASE_RPC`: Base network RPC URL
- `ARB_RPC`: Arbitrum network RPC URL
- `SEARCHER_PK`: Private key for transaction signing
- `EXECUTOR_CONTRACT`: Deployed ArbExecutor contract address
- `DATABASE_URL`: PostgreSQL connection string

### Strategy Configuration
Edit `bot/config/strategy.json`:
```json
{
  "minTvlUsd": 100000,
  "maxHops": 3,
  "flashloan": {
    "enabled": true,
    "amountUsd": 10000,
    "feePct": 0.0007
  },
  "profitFloorUsd": 0.01
}
```

## Usage

### Running the Bot
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f bot

# Stop the bot
docker compose stop bot
```

### Manual Operations
```bash
# Discover pools
npm run discover:base
npm run discover:arb

# Run backtest
npm run backtest base 1000 2000

# Backfill historical data
npm run backfill base 7
```

### Database Queries
```sql
-- Check recent profitable quotes
SELECT * FROM quotes 
WHERE profit_usd > 0.01 
ORDER BY ts DESC 
LIMIT 10;

-- Monitor execution success rate
SELECT status, COUNT(*) as count, AVG(profit_usd) as avg_profit
FROM executions 
WHERE ts > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

## Risk Management

The bot includes multiple layers of risk protection:

1. **Gas Price Protection**: Pauses when gas prices exceed 90th percentile
2. **Failure Rate Protection**: Pauses when failure rate exceeds 20%
3. **Slippage Protection**: Maximum 5% slippage per leg
4. **Profit Floor**: Minimum $0.01 profit required
5. **TVL Requirements**: Minimum $100k pool TVL

## Monitoring

### Metrics
- `executions_total`: Total number of executions
- `profit_usd`: Profit per execution
- `gas_price_gwei`: Current gas prices
- `route_quotes_total`: Total route quotes generated

### Alerts
- High gas price conditions
- Execution failure rates
- Database connection issues
- Contract interaction failures

## Development

### Local Development
```bash
cd bot
npm install
npm run dev
```

### Testing
```bash
cd contracts
forge test
```

### Code Structure
```
bot/src/
├── chains.ts          # Chain configuration and clients
├── discovery/         # Pool discovery modules
├── quotes/           # Price quoting modules
├── route/            # Route generation and scoring
├── exec/             # Transaction execution
├── db.ts             # Database operations
├── risk.ts           # Risk management
└── metrics.ts        # Metrics collection
```

## Security Considerations

1. **Private Key Management**: Use hardware wallets for production
2. **Contract Security**: Regular security audits recommended
3. **Network Security**: Use private RPC endpoints
4. **Access Control**: Implement proper access controls

## Troubleshooting

### Common Issues
- **Database Connection**: Check PostgreSQL status and connection string
- **RPC Issues**: Verify RPC URLs and rate limits
- **Transaction Failures**: Check gas prices and slippage settings
- **Low Profitability**: Adjust strategy parameters

### Logs
```bash
# View recent errors
docker compose logs bot | grep ERROR

# Monitor execution attempts
docker compose logs bot | grep "Executed route"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: See `ops/runbook.md` for detailed operations guide
- Community: Join our Discord for support and discussions
