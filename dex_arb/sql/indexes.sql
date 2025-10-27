-- Additional indexes for performance optimization
-- Run after schema.sql

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_quotes_chain_profit_ts ON quotes(chain, profit_usd DESC, ts DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_chain_profit ON transactions(chain, profit_usd DESC);
CREATE INDEX IF NOT EXISTS idx_pools_chain_tvl_dex ON pools(chain, tvl_usd DESC, dex);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(chain, ts) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_quotes_recent ON quotes(chain, profit_usd DESC) WHERE ts > NOW() - INTERVAL '1 hour';

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_quotes_legs_gin ON quotes USING GIN (legs);
CREATE INDEX IF NOT EXISTS idx_transactions_legs_gin ON transactions USING GIN (legs);
CREATE INDEX IF NOT EXISTS idx_metrics_metadata_gin ON metrics USING GIN (metadata);

-- Indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_quotes_hourly ON quotes(DATE_TRUNC('hour', ts), chain);
CREATE INDEX IF NOT EXISTS idx_transactions_daily ON transactions(DATE_TRUNC('day', ts), chain);

-- Indexes for risk management queries
CREATE INDEX IF NOT EXISTS idx_risk_limits_chain_type ON risk_limits(chain, limit_type);
CREATE INDEX IF NOT EXISTS idx_risk_limits_reset ON risk_limits(last_reset, reset_period);
