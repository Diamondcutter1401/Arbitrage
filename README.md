# DEX Arbitrage Bot — Detailed Guide (EN)

This repository contains a production-oriented arbitrage bot targeting Uniswap V3 (and optionally Curve) on Base & Arbitrum. It discovers pools via subgraphs, builds multi‑hop routes, quotes them on-chain, scores profitability after gas/slippage, and can execute via a custom `ArbExecutor` contract.

## Key Capabilities

- Multi-chain (Base, Arbitrum)
- Uniswap V3 pool discovery (subgraph + fallback legs) / Curve (if schema supports `pools`)
- On-chain quoting (Uniswap V3 QuoterV2)
- Route generation (2–3 legs) + scoring
- Optional contract execution (flash-loan capable `ArbExecutor`)
- Risk guards (gas cap, slippage, profit floor)
- PostgreSQL persistence (quotes, executions)
- Docker Compose deployment

## Repository Layout
```
bot/src/
  index.ts        -> Main loop: discovery → routes → quotes → score → (exec) → persist
  chains.ts       -> Chain config & viem clients
  discovery/      -> univ3.ts (Uniswap pools), curve.ts (Curve pools w/ introspection)
  quotes/         -> univ3.ts (QuoterV2), curve.ts (if used)
  route/          -> gen.ts (generate), score.ts (score & filter)
  exec/           -> tx.ts (build & send), bundle.ts (optional grouping)
  db.ts           -> Postgres connection/DAO
  risk.ts         -> Basic risk checks
  metrics.ts      -> In-memory metrics (Prometheus formatting helper)
bot/config/*.json -> Strategy, tokens, chains, dex definitions
ops/              -> docker-compose.yml, env.example, prometheus config
sql/              -> schema.sql + indexes.sql initialize DB
contracts/        -> ArbExecutor.sol & Foundry build/test infra
```

## Environment (.env)
Essential variables (placed in `ops/.env`):

| Variable | Purpose |
|----------|---------|
| BASE_RPC / ARB_RPC | RPC endpoints (embed provider API key) |
| BASE_UNIV3_SUBGRAPH / ARB_UNIV3_SUBGRAPH | Uniswap V3 subgraph (Graph gateway URL) |
| BASE_CURVE_SUBGRAPH / ARB_CURVE_SUBGRAPH | Curve subgraph (may lack `pools`; empty disables) |
| GRAPH_AUTH_MODE | `bearer` or `apikey` header style |
| GRAPH_API_KEY | API key for The Graph gateway (if not embedded in URL) |
| SEARCHER_PK | Private key for signing (dev only) |
| EXECUTOR_CONTRACT | Deployed `ArbExecutor` contract address (optional) |
| DATABASE_URL | Postgres connection string |
| PROFIT_FLOOR_USD | Minimum profit to keep a route |
| MAX_SLIPPAGE_BPS | Slippage cap per leg |

Security recommendation: never commit `.env`, rotate exposed keys immediately.

## Running with Docker
```powershell
# From ops directory
copy env.example .env
# Edit .env: set RPCs, subgraphs, GRAPH_API_KEY, etc.
docker compose up -d --build
docker compose logs -f bot
```
Expected healthy logs:
```
[base] Pools => UniV3: <N>, Curve: <M>
[arbitrum] Pools => UniV3: <N>, Curve: <M>
```
If Curve subgraph lacks `pools`, you’ll see a one‑time message and it’s skipped.

## Strategy Tuning Example (`bot/config/strategy.json`)
```json
{
  "minTvlUsd": 100000,
  "maxHops": 3,
  "profitFloorUsd": 0.01,
  "flashloan": { "enabled": true, "amountUsd": 10000, "feePct": 0.0007 }
}
```

## Typical Operational Flow
1. Discovery (subgraph) or fallback token legs if empty.
2. Route generation (pairwise & multi-hop combinations subject to maxHops).
3. Quote each leg (QuoterV2 / Curve formula).
4. Aggregate route PnL after gas & slippage adjustments.
5. Persist top profitable quotes; optionally broadcast transaction bundle.

## Database Quick Queries
```sql
SELECT ts, chain, profit_usd FROM quotes ORDER BY ts DESC LIMIT 20;
```

## Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| Unauthorized RPC | Missing API key | Embed key in RPC URL |
| Missing auth header (Graph) | GRAPH_API_KEY unset | Set key + restart |
| Curve `pools` error | Subgraph schema mismatch | Use correct Curve subgraph or skip |
| Zero profitable routes | TVL too low / config strict | Adjust strategy (minTvlUsd, profitFloor) |

## Extending
- Add `/metrics` HTTP server to expose `metrics.formatPrometheus()`.
- Add static seed pools JSON when subgraph unavailable.
- Integrate private orderflow (Flashbots / MEV-Share) in `exec/tx.ts`.

## Security
Replace dev keys; consider hardware signer. Review `ArbExecutor.sol` before production deployment.

## Contributing
Fork → branch → change → test → PR.

---

# DEX Arbitrage Bot — Hướng dẫn tiếng Việt (VI)

Xem file `README.vi.md` để biết phiên bản tiếng Việt chi tiết. Nội dung bao quát: kiến trúc, biến môi trường, cách chạy Docker, điều chỉnh chiến lược, xử lý lỗi thường gặp.

---

License: MIT
