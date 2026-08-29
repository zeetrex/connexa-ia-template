import { Pool } from 'pg';
import { env } from '../config/env.js';

function sslConfig(): false | { rejectUnauthorized: boolean } {
  if (env.DATABASE_SSL === 'disable') return false;
  return { rejectUnauthorized: env.DATABASE_SSL === 'verify-full' };
}

// search_path fija el schema propio del proyecto en cada conexión del pool —
// nunca se corre contra `public`. `,public` al final es sólo para que
// funciones/tipos del sistema sigan resolviendo si hiciera falta.
const SCHEMA_OPTIONS = `-c search_path={{DB_SCHEMA}},public`;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: sslConfig(),
  options: SCHEMA_OPTIONS,
});
