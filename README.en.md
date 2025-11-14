# DEX Arbitrage Bot — Detailed Guide (EN)

This is a production-oriented arbitrage bot for Base and Arbitrum. It discovers pools via subgraphs (Uniswap V3, optionally Curve), generates candidate routes, fetches on‑chain quotes, scores profitability after gas and slippage, and can execute via a custom contract.

## Highlights
- Multi-chain (Base, Arbitrum)
- Uniswap V3 discovery + Curve (if schema compatible)
- On-chain quoting (QuoterV2)
- Route generation & scoring
- Optional execution via `ArbExecutor` (Foundry)
- PostgreSQL persistence
- Docker Compose deployment

## Repo Map
```
bot/src/
  index.ts        -> Main loop (discover → routes → quotes → score → (exec))
  chains.ts       -> Chain configs & clients
  discovery/      -> univ3.ts, curve.ts (gateway auth + Curve introspection)
  quotes/         -> univ3.ts (QuoterV2), curve.ts
  route/          -> gen.ts, score.ts
  exec/           -> tx.ts, bundle.ts
  db.ts           -> Postgres persistence
  risk.ts         -> Risk controls
  metrics.ts      -> Prometheus-format helper (no HTTP server by default)
ops/
  docker-compose.yml, env.example, prometheus.yml/
sql/
  schema.sql, indexes.sql
contracts/
  ArbExecutor.sol, Foundry setup
```

## Environment (ops/.env)
- BASE_RPC / ARB_RPC: RPC endpoints with key embedded (Ankr/Alchemy)
- BASE_UNIV3_SUBGRAPH / ARB_UNIV3_SUBGRAPH: The Graph gateway URIs
- BASE_CURVE_SUBGRAPH / ARB_CURVE_SUBGRAPH: Curve subgraphs (may lack `pools`)
- GRAPH_AUTH_MODE: `bearer` or `apikey` (header style)
- GRAPH_API_KEY: gateway key (header) unless embedded into URL
- DATABASE_URL, SEARCHER_PK, EXECUTOR_CONTRACT, LOG_LEVEL, etc.

## Run
```powershell
cd D:\Workspace\HHT\Abitrage\Arbitrage\ops
copy env.example .env
# Edit .env (RPC, subgraphs, GRAPH_API_KEY,...)
docker compose up -d --build
docker compose logs -f bot
```
Expected:
```
[base] Pools => UniV3: N, Curve: M
[arbitrum] Pools => UniV3: N, Curve: M
```
If Curve lacks `pools`, the bot logs once and skips Curve discovery.

## Strategy (bot/config/strategy.json)
```json
{
  "minTvlUsd": 100000,
  "maxHops": 3,
  "profitFloorUsd": 0.01,
  "flashloan": { "enabled": true, "amountUsd": 10000, "feePct": 0.0007 }
}
```

## Quick DB check
```sql
SELECT ts, chain, profit_usd FROM quotes ORDER BY ts DESC LIMIT 20;
```

## Troubleshooting
- Unauthorized RPC → missing API key → embed key in URL
- Missing authorization header (Graph) → set GRAPH_API_KEY & restart
- Curve schema mismatch → use a Curve subgraph that exposes `pools` or skip
- Zero profitable routes → relax strategy or improve discovery set

## Next steps
- Add HTTP `/metrics` to expose `metrics.formatPrometheus()`
- Provide static seed pools when subgraphs are unavailable
- Integrate private orderflow in `exec/tx.ts`

## Security
Never commit `.env`. Rotate leaked keys. Audit `ArbExecutor.sol` before prod.

License: MIT
