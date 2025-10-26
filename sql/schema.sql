-- Pools table for storing discovered DEX pools
CREATE TABLE pools (
  id SERIAL PRIMARY KEY,
  chain TEXT NOT NULL,
  dex TEXT NOT NULL,
  address BYTEA NOT NULL,
  token0 BYTEA NOT NULL,
  token1 BYTEA NOT NULL,
  fee_bps INTEGER,
  tvl_usd NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chain, dex, address)
);

-- Quotes table for storing route quotes and profitability analysis
CREATE TABLE quotes (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chain TEXT NOT NULL,
  route_hash BYTEA NOT NULL,
  amount_in_usd NUMERIC NOT NULL,
  amount_out_usd NUMERIC NOT NULL,
  gas_estimate_usd NUMERIC NOT NULL,
  flash_fee_usd NUMERIC NOT NULL,
  profit_usd NUMERIC NOT NULL,
  legs JSONB NOT NULL
);

-- Executions table for tracking transaction execution
CREATE TABLE executions (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chain TEXT NOT NULL,
  tx_hash BYTEA,
  private_sent BOOLEAN,
  status TEXT,
  gas_used NUMERIC,
  gas_price_gwei NUMERIC,
  profit_usd NUMERIC,
  reason TEXT
);

-- Gas prices table for tracking gas price history
CREATE TABLE gas_prices (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chain TEXT NOT NULL,
  base_fee_gwei NUMERIC NOT NULL,
  priority_fee_gwei NUMERIC NOT NULL,
  gas_price_gwei NUMERIC NOT NULL
);

-- Performance metrics table
CREATE TABLE metrics (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chain TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  labels JSONB
);
