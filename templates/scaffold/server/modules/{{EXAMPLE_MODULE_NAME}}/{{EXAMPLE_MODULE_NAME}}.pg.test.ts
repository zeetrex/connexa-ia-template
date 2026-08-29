import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import type { Transaction } from '../../platform/db/transaction.js';

const HAS_DB = !!process.env.DATABASE_URL;
let pool: Pool;

beforeAll(async () => {
  if (!HAS_DB) return;
  ({ pool } = (await import('../../platform/db/pool.js')) as unknown as { pool: Pool });
});

afterAll(async () => {
  if (HAS_DB && pool) await pool.end();
});

async function inSavepoint(body: (tx: Transaction) => Promise<void>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SAVEPOINT sp_test');
    await body(client);
    await client.query('ROLLBACK TO SAVEPOINT sp_test');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

describe.skipIf(!HAS_DB)('{{EXAMPLE_MODULE_NAME}} — integración contra Postgres real', () => {
  it('ciclo completo create → update → deleteById', async () => {
    const { Pg{{EXAMPLE_MODULE_NAME_PASCAL}}Repository } = await import('./infra/{{EXAMPLE_MODULE_NAME}}.repository.pg.js');
    const repo = new Pg{{EXAMPLE_MODULE_NAME_PASCAL}}Repository();

    await inSavepoint(async (tx) => {
      const created = await repo.create(tx, { title: 'Integración', description: 'desc' });
      expect(created.status).toBe('pending');

      const updated = await repo.update(tx, created.id, { status: 'done' });
      expect(updated?.status).toBe('done');

      const deleted = await repo.deleteById(tx, created.id);
      expect(deleted).toBe(true);

      const gone = await repo.findById(tx, created.id);
      expect(gone).toBeNull();
    });
  });
});
