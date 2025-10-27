-- Database schema for arbitrage bot
-- Run this once to create the database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Quotes table - stores arbitrage opportunities
CREATE TABLE IF NOT EXISTS quotes (
    id BIGSERIAL PRIMARY KEY,
    chain VARCHAR(50) NOT NULL,
    amount_in_usd DECIMAL(20, 8) NOT NULL,
    amount_out_usd DECIMAL(20, 8) NOT NULL,
    gas_estimate_usd DECIMAL(20, 8) NOT NULL,
    flash_fee_usd DECIMAL(20, 8) NOT NULL,
    profit_usd DECIMAL(20, 8) NOT NULL,
    legs JSONB NOT NULL,
    ts TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table - stores execution records
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    chain VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    gas_used BIGINT,
    gas_price BIGINT,
    profit_usd DECIMAL(20, 8),
    legs JSONB,
    ts TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pools table - stores pool information cache
CREATE TABLE IF NOT EXISTS pools (
    id BIGSERIAL PRIMARY KEY,
    chain VARCHAR(50) NOT NULL,
    dex VARCHAR(50) NOT NULL,
    address VARCHAR(42) NOT NULL,
    token0 VARCHAR(42),
    token1 VARCHAR(42),
    tvl_usd DECIMAL(20, 8),
    fee_tier BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chain, dex, address)
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL PRIMARY KEY,
    chain VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20, 8) NOT NULL,
    metadata JSONB,
    ts TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk management table
CREATE TABLE IF NOT EXISTS risk_limits (
    id BIGSERIAL PRIMARY KEY,
    chain VARCHAR(50) NOT NULL,
    limit_type VARCHAR(50) NOT NULL,
    limit_value DECIMAL(20, 8) NOT NULL,
    current_value DECIMAL(20, 8) NOT NULL DEFAULT 0,
    reset_period VARCHAR(20) DEFAULT 'daily',
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chain, limit_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_chain_ts ON quotes(chain, ts DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_profit ON quotes(profit_usd DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_chain_status ON transactions(chain, status);
CREATE INDEX IF NOT EXISTS idx_transactions_ts ON transactions(ts DESC);
CREATE INDEX IF NOT EXISTS idx_pools_chain_dex ON pools(chain, dex);
CREATE INDEX IF NOT EXISTS idx_pools_tvl ON pools(tvl_usd DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_chain_name ON metrics(chain, metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics(ts DESC);

-- Insert default risk limits
INSERT INTO risk_limits (chain, limit_type, limit_value, current_value) VALUES
('base', 'max_position_size_usd', 50000, 0),
('base', 'max_daily_loss_usd', 1000, 0),
('arbitrum', 'max_position_size_usd', 50000, 0),
('arbitrum', 'max_daily_loss_usd', 1000, 0)
ON CONFLICT (chain, limit_type) DO NOTHING;
