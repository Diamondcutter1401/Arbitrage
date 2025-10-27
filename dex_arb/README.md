# DEX Arbitrage Bot

A sophisticated arbitrage bot that discovers and executes profitable trades across multiple DEXes on Base, Arbitrum, and other EVM-compatible chains.

## Features

- **Multi-Chain Support**: Base, Arbitrum (with extensibility for IMX, Metis)
- **Multi-DEX Integration**: Uniswap v3, Curve Finance
- **Advanced Routing**: 2-leg and 3-leg arbitrage strategies
- **Flashloan Support**: Aave v3 integration for capital efficiency
- **Private Mempool**: MEV protection via private transaction submission
- **Real-time Discovery**: Subgraph-based pool discovery
- **Risk Management**: TVL filters, profit gates, position limits
- **Database Storage**: PostgreSQL for quote and transaction tracking
- **Docker Deployment**: Containerized setup with docker-compose

## Architecture

```
dex-arb/
├── contracts/           # Solidity smart contracts
├── pybot/              # Python bot implementation
│   ├── discovery/      # Pool discovery modules
│   ├── quotes/         # Price quoting modules
│   ├── routing/        # Route generation and scoring
│   ├── exec/          # Transaction execution
│   ├── state/         # State management and caching
│   ├── db/            # Database models and operations
│   └── utils/         # Utility functions
├── config/            # Configuration files
├── sql/               # Database schema
└── ops/               # Docker and deployment
```

## Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- PostgreSQL 16+
- Web3 RPC endpoints (Alchemy, Infura, etc.)
- Private key for transaction signing

### Setup

1. **Clone and configure**:
   ```bash
   git clone <repository-url>
   cd dex-arb
   cp ops/.env.example ops/.env
   # Edit ops/.env with your configuration
   ```

2. **Deploy contracts**:
   ```bash
   # Deploy ArbExecutor.sol to your target chains
   # Update EXECUTOR_CONTRACT in .env
   ```

3. **Start services**:
   ```bash
   cd ops
   docker-compose up -d
   ```

4. **Monitor logs**:
   ```bash
   docker-compose logs -f bot
   ```

## Configuration

### Chain Configuration (`config/chains.yaml`)

```yaml
base:
  rpc: ${BASE_RPC}
  private_tx_rpc: ${BASE_PRIVATE_TX_RPC}
  aave_pool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
  univ3:
    router: "0x2626664c2603336E57B271c5C0b26F421741e481"
    quoter_v2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"
```

### Strategy Configuration (`config/strategy.yaml`)

```yaml
limits:
  max_hops: 3
  min_tvl_usd: 100000
  deny_fee_on_transfer: true

flashloan:
  enabled: true
  amount_usd: 10000
  fee_pct: 0.0007

profit:
  slippage_bps_per_leg: 5
  profit_floor_usd: 0.01
```

## Usage

### Running the Bot

```bash
# Development
python -m pybot.main

# Production (Docker)
docker-compose up -d
```

### Monitoring

- **Database**: Connect to PostgreSQL on port 5432
- **Logs**: Check `docker-compose logs -f bot`
- **Metrics**: Built-in Prometheus metrics (port 8000)

### Key Tables

- `quotes`: Arbitrage opportunities discovered
- `transactions`: Execution records
- `pools`: Cached pool information
- `risk_limits`: Risk management settings

## Development

### Adding New Chains

1. Add chain config to `config/chains.yaml`
2. Update `pybot/main.py` discovery loop
3. Add token configs in `config/tokens.{chain}.yaml`

### Adding New DEXes

1. Create discovery module in `pybot/discovery/`
2. Create quote module in `pybot/quotes/`
3. Update routing logic in `pybot/routing/`
4. Add execution logic in `pybot/exec/`

### Testing

```bash
# Run tests
pytest

# Type checking
mypy pybot/

# Code formatting
black pybot/
```

## Risk Management

- **Position Limits**: Maximum position size per chain
- **Daily Loss Limits**: Stop trading after daily loss threshold
- **TVL Filters**: Only trade pools above minimum TVL
- **Slippage Protection**: Built-in slippage calculations
- **Gas Price Limits**: Avoid trading during high gas periods

## Security Considerations

- **Private Keys**: Store securely, never commit to version control
- **RPC Endpoints**: Use reliable providers with rate limiting
- **Smart Contracts**: Audit ArbExecutor.sol before mainnet deployment
- **Database**: Secure PostgreSQL instance
- **Network Security**: Use VPN or private networks for production

## Performance Optimization

- **Pool Caching**: In-memory cache with periodic refresh
- **Parallel Discovery**: Concurrent subgraph queries
- **Database Indexing**: Optimized queries for large datasets
- **Connection Pooling**: Efficient database connections

## Troubleshooting

### Common Issues

1. **RPC Connection Errors**: Check RPC URLs and rate limits
2. **Database Connection**: Verify PostgreSQL is running
3. **Contract Deployment**: Ensure ArbExecutor is deployed correctly
4. **Private Key Issues**: Verify key format and permissions

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=DEBUG docker-compose up

# Check database
docker-compose exec db psql -U arb -d arb

# View recent quotes
SELECT * FROM quotes ORDER BY ts DESC LIMIT 10;
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This software is for educational and research purposes. Trading cryptocurrencies involves significant risk. Use at your own risk and never trade with funds you cannot afford to lose.
