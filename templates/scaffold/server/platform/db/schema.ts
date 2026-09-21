import type { Transaction } from './transaction.js';

// Schema propio del proyecto. Se fija con SET LOCAL dentro de cada transacción,
// no por conexión (`options` / SET de sesión): los poolers en transaction mode
// (p. ej. Neon pooled) rechazan `options` o pierden el SET de sesión.
// Sin `public` en el path, a propósito: si falta el schema o una tabla, la query
// falla con `relation "..." does not exist` en vez de leer otra tabla en silencio.
export const DB_SCHEMA = '{{DB_SCHEMA}}';

export async function beginTransaction(tx: Transaction): Promise<void> {
  await tx.query('BEGIN');
  await tx.query(`SET LOCAL search_path TO "${DB_SCHEMA}"`);
}
