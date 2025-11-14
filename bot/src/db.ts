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
  private enabled: boolean;

  constructor(connectionString: string) {
    this.enabled = !!connectionString;
    this.pool = this.enabled
      ? new Pool({
          connectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        })
      : (undefined as any);
  }

  private hexToBuffer(value?: string | null): Buffer | null {
    if (!value) return null;
    // Accept already-buffered content disguised as string
    const hex = value.toString();
    if (!hex.startsWith("0x")) return null;
    try { return Buffer.from(hex.slice(2), "hex"); } catch { return null; }
  }

  async insertPool(pool: PoolData): Promise<void> {
    if (!this.enabled) return;
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

    const addr = this.hexToBuffer(pool.address);
    const t0 = this.hexToBuffer(pool.token0);
    const t1 = this.hexToBuffer(pool.token1);
    await this.pool.query(query, [
      pool.chain,
      pool.dex,
      addr,
      t0,
      t1,
      pool.fee_bps,
      pool.tvl_usd
    ]);
  }

  async insertQuote(quote: QuoteData): Promise<void> {
    if (!this.enabled) return;
    const query = `
      INSERT INTO quotes (ts, chain, route_hash, amount_in_usd, amount_out_usd, 
                         gas_estimate_usd, flash_fee_usd, profit_usd, legs)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const routeHash = this.hexToBuffer(quote.route_hash);
    await this.pool.query(query, [
      quote.ts,
      quote.chain,
      routeHash,
      quote.amount_in_usd,
      quote.amount_out_usd,
      quote.gas_estimate_usd,
      quote.flash_fee_usd,
      quote.profit_usd,
      JSON.stringify(quote.legs)
    ]);
  }

  async insertExecution(execution: ExecutionData): Promise<void> {
    if (!this.enabled) return;
    const query = `
      INSERT INTO executions (ts, chain, tx_hash, private_sent, status, 
                             gas_used, gas_price_gwei, profit_usd, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const txHash = this.hexToBuffer(execution.tx_hash as any);
    await this.pool.query(query, [
      execution.ts,
      execution.chain,
      txHash,
      execution.private_sent,
      execution.status,
      execution.gas_used,
      execution.gas_price_gwei,
      execution.profit_usd,
      execution.reason
    ]);
  }

  async getRecentQuotes(chain: string, limit = 100): Promise<QuoteData[]> {
    if (!this.enabled) return [] as any;
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
    if (!this.enabled) return [] as any;
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
    if (this.enabled) await this.pool.end();
  }
}
