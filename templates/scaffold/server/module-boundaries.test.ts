import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(import.meta.dirname);
const MODULES_DIR = join(ROOT, 'modules');
const PLATFORM_DIR = join(ROOT, 'platform');

const IMPORT_RE = /(?:from\s+|require\()\s*['"]([^'"]+)['"]/g;

function listSourceFiles(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out = out.concat(listSourceFiles(full));
    } else if (/\.ts$/.test(entry) && !entry.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

function importsOf(filePath: string): string[] {
  return [...readFileSync(filePath, 'utf-8').matchAll(IMPORT_RE)].map((m) => m[1]);
}

function moduleNameOf(filePath: string): string {
  return relative(MODULES_DIR, filePath).split('/')[0];
}

describe('bajo acoplamiento y dirección de dependencias entre módulos (RF-16)', () => {
  it('ningún módulo importa de otro módulo de dominio', () => {
    for (const file of listSourceFiles(MODULES_DIR)) {
      const ownModule = moduleNameOf(file);
      for (const imp of importsOf(file)) {
        if (!imp.startsWith('../') && !imp.startsWith('./')) continue; // paquete externo, no aplica.
        const resolved = join(file, '..', imp);
        if (!resolved.startsWith(MODULES_DIR)) continue; // apunta a platform/ u otro lugar, permitido.
        const importedModule = moduleNameOf(resolved);
        expect(
          importedModule,
          `${relative(ROOT, file)} importa "${imp}", del módulo "${importedModule}" — sólo puede importar de su propio módulo ("${ownModule}") o de platform/`,
        ).toBe(ownModule);
      }
    }
  });

  it('platform/ nunca importa de un módulo de dominio', () => {
    for (const file of listSourceFiles(PLATFORM_DIR)) {
      for (const imp of importsOf(file)) {
        expect(
          imp.includes('/modules/'),
          `${relative(ROOT, file)} importa "${imp}" — platform/ no puede depender de ningún módulo de dominio`,
        ).toBe(false);
      }
    }
  });
});
