import { pool } from './pool.js';
import type { Transaction } from './transaction.js';

/**
 * BEGIN/COMMIT/ROLLBACK reusable — ningún caso de uso toca `pg` directo.
 */
export async function withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
