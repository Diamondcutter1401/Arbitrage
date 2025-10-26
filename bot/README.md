# DEX Arbitrage Bot - TypeScript Bot

This directory contains the TypeScript arbitrage bot implementation.

## Structure

- **src/**: Main bot source code
  - **index.ts**: Main bot entry point
  - **chains.ts**: Chain configuration and client setup
  - **discovery/**: Pool discovery modules
  - **quotes/**: Price quoting modules
  - **route/**: Route generation and scoring
  - **exec/**: Transaction execution
  - **db.ts**: Database operations
  - **risk.ts**: Risk management
  - **metrics.ts**: Metrics collection
- **config/**: Configuration files
- **scripts/**: Utility scripts

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Building

```bash
npm run build
```

## Scripts

- `npm run discover:base`: Discover pools on Base
- `npm run discover:arb`: Discover pools on Arbitrum
- `npm run backtest`: Run backtest analysis
- `npm run backfill`: Backfill historical data

## Configuration

Edit configuration files in the `config/` directory:
- `chains.json`: Chain-specific settings
- `tokens.*.json`: Token configurations
- `dex.*.json`: DEX-specific settings
- `strategy.json`: Bot strategy parameters
- `denylist.json`: Token/pool denylist

## Environment Variables

Set up your environment variables in `ops/.env`:
- RPC URLs for Base and Arbitrum
- Private keys for transaction signing
- Database connection string
- Contract addresses

## Monitoring

The bot exposes metrics and logs for monitoring:
- PostgreSQL database for persistence
- Prometheus metrics (optional)
- Comprehensive logging
- Health checks
