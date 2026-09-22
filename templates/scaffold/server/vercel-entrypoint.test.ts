import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(import.meta.dirname, '..');

type Rewrite = { source: string; destination: string };

// Subconjunto de la sintaxis de `source` de Vercel que usamos: literal + `(.*)`.
function matches(source: string, path: string): boolean {
  const escape = (part: string) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = source.split('(.*)').map(escape).join('.*');
  return new RegExp(`^${pattern}$`).test(path);
}

describe('entrypoint serverless de Vercel', () => {
  it('toda ruta bajo /api se reescribe a la función api/index', () => {
    const { rewrites } = JSON.parse(readFileSync(join(REPO_ROOT, 'vercel.json'), 'utf-8')) as {
      rewrites: Rewrite[];
    };
    for (const path of ['/api', '/api/health', '/api/auth/google', '/api/admin/users/1']) {
      const rewrite = rewrites.find((r) => matches(r.source, path));
      expect(rewrite?.destination, path).toBe('/api/index');
    }
  });

  it('api/index.ts exporta por default el mismo app de server/index.ts', async () => {
    process.env.DATABASE_URL ??= 'postgres://test@localhost:5432/test';
    process.env.AUTH_JWT_SECRET ??= 'x'.repeat(32);
    process.env.GOOGLE_CLIENT_ID ??= 'test-client-id';
    const entry = await import('../api/index.js');
    const { app } = await import('./index.js');
    expect(typeof entry.default).toBe('function');
    expect(entry.default).toBe(app);
  });
});
