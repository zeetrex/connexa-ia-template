import { Pool } from 'pg';
import { env } from '../config/env.js';

function sslConfig(): false | { rejectUnauthorized: boolean } {
  if (env.DATABASE_SSL === 'disable') return false;
  return { rejectUnauthorized: env.DATABASE_SSL === 'verify-full' };
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: sslConfig(),
});
