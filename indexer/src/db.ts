import { Pool, PoolClient } from 'pg';

const DEFAULT_POOL_SIZE = 20;

export function getPoolSize(envVal: string | undefined = process.env.DATABASE_POOL_SIZE): number {
  if (envVal === undefined || envVal === null || String(envVal).trim() === '') {
    return DEFAULT_POOL_SIZE;
  }
  const str = String(envVal).trim();
  const parsed = Number(str);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    console.warn(
      `Invalid DATABASE_POOL_SIZE "${envVal}". Expected integer between 1 and 100. Falling back to default (${DEFAULT_POOL_SIZE}).`
    );
    return DEFAULT_POOL_SIZE;
  }
  return parsed;
}

const MIGRATION_LOCK_ID = 836;

export class Database {
  private pool: Pool;

  constructor(connectionString: string, maxPoolSize: number = getPoolSize()) {
    this.pool = new Pool({ connectionString, max: maxPoolSize });
  }

  async init(): Promise<void> {
    const client = await this.pool.connect();
    let locked = false;
    try {
      await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
      locked = true;

      await client.query('BEGIN');
      try {
        await this.runMigrations(client);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    } finally {
      if (locked) {
        try {
          await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
        } catch (unlockErr) {
          console.error('Failed to release migration advisory lock:', unlockErr);
        }
      }
      client.release();
    }
  }

  private async runMigrations(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
