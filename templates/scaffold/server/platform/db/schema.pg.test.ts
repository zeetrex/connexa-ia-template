import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { DB_SCHEMA } from './schema.js';

const HAS_DB = !!process.env.DATABASE_URL;
let pool: Pool;

beforeAll(async () => {
  if (!HAS_DB) return;
  ({ pool } = (await import('./pool.js')) as unknown as { pool: Pool });
});

afterAll(async () => {
  if (HAS_DB && pool) await pool.end();
});

describe.skipIf(!HAS_DB)('schema — search_path fijo por transacción, sin fallback a public', () => {
  it('withTransaction corre con search_path exactamente el schema del proyecto', async () => {
    const { withTransaction } = await import('./unit-of-work.js');
    const searchPath = await withTransaction(async (tx) => {
      const { rows } = await tx.query<{ search_path: string }>('SHOW search_path');
      return rows[0].search_path;
    });
    expect(searchPath).toBe(DB_SCHEMA);
  });

  it('una tabla que sólo existe en public no resuelve: la query falla en vez de leerla', async () => {
    const { withTransaction } = await import('./unit-of-work.js');
    class ForceRollback extends Error {}
    let outcome = 'la query resolvió (public sigue en el search_path)';
    // Siempre termina en ROLLBACK (ForceRollback), incluso si hay una regresión — la tabla de prueba nunca persiste.
    await expect(
      withTransaction(async (tx) => {
        await tx.query('CREATE TABLE public.schema_probe (id INT)');
        await tx.query('SAVEPOINT probe');
        try {
          await tx.query('SELECT 1 FROM schema_probe');
        } catch (err) {
          outcome = (err as Error).message;
        }
        throw new ForceRollback();
      }),
    ).rejects.toBeInstanceOf(ForceRollback);
    expect(outcome).toMatch(/relation "schema_probe" does not exist/);
  });
});
