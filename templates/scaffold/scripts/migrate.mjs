// Corre node-pg-migrate SIEMPRE contra la conexión directa (DATABASE_URL_UNPOOLED).
// Uso: node scripts/migrate.mjs <schema> <up|down>
//
// Por qué no DATABASE_URL: node-pg-migrate fija el schema con un SET search_path de
// sesión. Detrás de un pooler en transaction mode (Neon pooled, pgbouncer) ese SET no
// está garantizado y las tablas pueden caer en `public` sin error. Sin fallback a
// DATABASE_URL, a propósito: si falta la variable, se corta.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

const URL_VAR = 'DATABASE_URL_UNPOOLED';
const [schema, direction] = process.argv.slice(2);

if (!schema || !['up', 'down'].includes(direction)) {
  console.error('Uso: node scripts/migrate.mjs <schema> <up|down>');
  process.exit(2);
}

const url = process.env[URL_VAR];
if (!url) {
  console.error(
    `${URL_VAR} no está seteada. Las migraciones deben correr contra la conexión directa ` +
      '(sin pooler), nunca contra DATABASE_URL. En local, poné el mismo valor que DATABASE_URL.',
  );
  process.exit(1);
}

// Relaciones (tablas, vistas, secuencias, ...) que existen hoy en `public`.
async function publicRelations() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')`,
    );
    return new Set(rows.map((row) => row.relname));
  } finally {
    await client.end();
  }
}

const before = await publicRelations();

const result = spawnSync(
  'node-pg-migrate',
  ['-m', 'server/migrations', '--schema', schema, '--create-schema', '-d', URL_VAR, direction],
  { stdio: 'inherit' },
);
if (result.error) {
  console.error(`No se pudo ejecutar node-pg-migrate: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

// Red de seguridad: nada nuevo debe haber aparecido en `public` (no puede deshacerse acá).
const leaked = [...(await publicRelations())].filter((name) => !before.has(name));
if (leaked.length > 0) {
  console.error(
    `\nERROR: la migración dejó objetos en el schema "public": ${leaked.join(', ')}.\n` +
      `Deberían estar en "${schema}". Revisá que ${URL_VAR} sea la conexión directa (sin pooler) ` +
      'y limpiá esos objetos a mano antes de reintentar.',
  );
  process.exit(1);
}
