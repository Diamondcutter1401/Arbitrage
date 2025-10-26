import { Pool } from "pg";

export interface PoolData {
  id: number;
  chain: string;
  dex: string;
  address: string;
  token0: string;
  token1: string;
  fee_bps?: number;
  tvl_usd: number;
  updated_at: Date;
}

export interface QuoteData {
  id?: number;
  ts: Date;
  chain: string;
  route_hash: string;
  amount_in_usd: number;
  amount_out_usd: number;
  gas_estimate_usd: number;
  flash_fee_usd: number;
  profit_usd: number;
  legs: any;
}

export interface ExecutionData {
  id?: number;
  ts: Date;
  chain: string;
  tx_hash?: string;
  private_sent: boolean;
  status: string;
  gas_used?: number;
  gas_price_gwei?: number;
  profit_usd?: number;
  reason?: string;
}

export class Database {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async insertPool(pool: PoolData): Promise<void> {
    const query = `
      INSERT INTO pools (chain, dex, address, token0, token1, fee_bps, tvl_usd)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (chain, dex, address) 
      DO UPDATE SET 
        token0 = EXCLUDED.token0,
        token1 = EXCLUDED.token1,
        fee_bps = EXCLUDED.fee_bps,
        tvl_usd = EXCLUDED.tvl_usd,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      pool.chain,
      pool.dex,
      pool.address,
      pool.token0,
      pool.token1,
      pool.fee_bps,
      pool.tvl_usd
    ]);
  }

  async insertQuote(quote: QuoteData): Promise<void> {
    const query = `
      INSERT INTO quotes (ts, chain, route_hash, amount_in_usd, amount_out_usd, 
                         gas_estimate_usd, flash_fee_usd, profit_usd, legs)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await this.pool.query(query, [
      quote.ts,
      quote.chain,
      quote.route_hash,
      quote.amount_in_usd,
      quote.amount_out_usd,
      quote.gas_estimate_usd,
      quote.flash_fee_usd,
      quote.profit_usd,
      JSON.stringify(quote.legs)
    ]);
  }

  async insertExecution(execution: ExecutionData): Promise<void> {
    const query = `
      INSERT INTO executions (ts, chain, tx_hash, private_sent, status, 
                             gas_used, gas_price_gwei, profit_usd, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await this.pool.query(query, [
      execution.ts,
      execution.chain,
      execution.tx_hash,
      execution.private_sent,
      execution.status,
      execution.gas_used,
      execution.gas_price_gwei,
      execution.profit_usd,
      execution.reason
    ]);
  }

  async getRecentQuotes(chain: string, limit = 100): Promise<QuoteData[]> {
    const query = `
      SELECT * FROM quotes 
      WHERE chain = $1 
      ORDER BY ts DESC 
      LIMIT $2
    `;

    const result = await this.pool.query(query, [chain, limit]);
    return result.rows;
  }

  async getRecentExecutions(chain: string, limit = 100): Promise<ExecutionData[]> {
    const query = `
      SELECT * FROM executions 
      WHERE chain = $1 
      ORDER BY ts DESC 
      LIMIT $2
    `;

    const result = await this.pool.query(query, [chain, limit]);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
