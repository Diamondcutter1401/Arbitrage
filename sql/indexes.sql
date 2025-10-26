-- Indexes for optimal query performance

-- Pools table indexes
CREATE INDEX idx_pools_chain_dex ON pools(chain, dex);
CREATE INDEX idx_pools_tvl_usd ON pools(tvl_usd DESC);
CREATE INDEX idx_pools_updated_at ON pools(updated_at);

-- Quotes table indexes
CREATE INDEX idx_quotes_ts ON quotes(ts);
CREATE INDEX idx_quotes_chain ON quotes(chain);
CREATE INDEX idx_quotes_profit_usd ON quotes(profit_usd DESC);
CREATE INDEX idx_quotes_chain_ts ON quotes(chain, ts);

-- Executions table indexes
CREATE INDEX idx_executions_ts ON executions(ts);
CREATE INDEX idx_executions_chain ON executions(chain);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_chain_ts ON executions(chain, ts);
CREATE INDEX idx_executions_tx_hash ON executions(tx_hash);

-- Gas prices table indexes
CREATE INDEX idx_gas_prices_ts ON gas_prices(ts);
CREATE INDEX idx_gas_prices_chain ON gas_prices(chain);
CREATE INDEX idx_gas_prices_chain_ts ON gas_prices(chain, ts);

-- Metrics table indexes
CREATE INDEX idx_metrics_ts ON metrics(ts);
CREATE INDEX idx_metrics_chain ON metrics(chain);
CREATE INDEX idx_metrics_name ON metrics(metric_name);
CREATE INDEX idx_metrics_chain_name_ts ON metrics(chain, metric_name, ts);

-- Composite indexes for common queries
CREATE INDEX idx_quotes_profitable ON quotes(profit_usd DESC, ts DESC) WHERE profit_usd > 0;
CREATE INDEX idx_executions_successful ON executions(status, ts DESC) WHERE status = 'success';
CREATE INDEX idx_pools_active ON pools(chain, dex, tvl_usd DESC) WHERE tvl_usd > 100000;
