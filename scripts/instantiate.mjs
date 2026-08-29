#!/usr/bin/env node
// Instancia un proyecto nuevo a partir de templates/scaffold/ — copia el árbol
// y sustituye placeholders de forma determinística, sin que ningún agente
// tenga que retipear código leyendo plan.md. Ver specs/001-scaffold-inicial/
// plan.md §15 para el porqué de este script.
//
// Uso:
//   node scripts/instantiate.mjs <project-name> [destination]
//     [--example-module=name] [--allowed-domains=a.com,b.com]

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SCAFFOLD_DIR = path.join(REPO_ROOT, 'templates', 'scaffold');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      flags[key] = rest.join('=');
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function assertKebabCase(name, label) {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
    fail(`${label} "${name}" no es kebab-case válido (ej. "inventory-vision", "example").`);
  }
}

function toPascalCase(kebab) {
  return kebab
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

function toTitleCase(kebab) {
  return kebab
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function toSnakeCase(kebab) {
  return kebab.replaceAll('-', '_');
}

function pluralize(word) {
  if (/[a-z]y$/.test(word) && !/[aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/.test(word)) return word + 'es';
  return word + 's';
}

function deriveTokens({ projectName, exampleModule, allowedDomains }) {
  const projectNamePascal = toPascalCase(projectName);
  const projectNameTitle = toTitleCase(projectName);
  const dbSchema = toSnakeCase(projectName);
  const databaseName = `${dbSchema}_dev`;

  const exampleModulePascal = toPascalCase(exampleModule);
  const exampleEntityTable = toSnakeCase(exampleModule);
  const exampleModulePath = pluralize(exampleModule);

  const allowedDomainsLiteral = `[${allowedDomains.map((d) => `'${d}'`).join(', ')}]`;

  return {
    '{{PROJECT_NAME}}': projectName,
    '{{PROJECT_NAME_PASCAL}}': projectNamePascal,
    '{{PROJECT_NAME_TITLE}}': projectNameTitle,
    '{{DB_SCHEMA}}': dbSchema,
    '{{DATABASE_NAME}}': databaseName,
    '{{ALLOWED_EMAIL_DOMAINS}}': allowedDomainsLiteral,
    '{{EXAMPLE_MODULE_NAME_PASCAL}}': exampleModulePascal,
    '{{EXAMPLE_MODULE_NAME}}': exampleModule,
    '{{EXAMPLE_ENTITY_TABLE}}': exampleEntityTable,
    '{{EXAMPLE_MODULE_PATH}}': exampleModulePath,
  };
}

function isBinaryLikely(filePath) {
  // El scaffold es 100% texto (ts/tsx/json/sql/md/css/html) — no hace falta
  // detección real de binarios, sólo evitar reventar si alguna vez se agrega uno.
  return /\.(png|jpg|jpeg|gif|ico|woff2?|ttf|eot)$/i.test(filePath);
}

function listAllFiles(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(listAllFiles(full));
    else out.push(full);
  }
  return out;
}

function listAllPaths(dir) {
  // Archivos y directorios, para el paso de renombrado.
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    out.push(full);
    if (entry.isDirectory()) out = out.concat(listAllPaths(full));
  }
  return out;
}

function substituteContent(destDir, tokens) {
  for (const file of listAllFiles(destDir)) {
    if (isBinaryLikely(file)) continue;
    const original = fs.readFileSync(file, 'utf8');
    let updated = original;
    for (const [token, value] of Object.entries(tokens)) {
      updated = updated.split(token).join(value);
    }
    if (updated !== original) fs.writeFileSync(file, updated, 'utf8');
  }
}

function renamePaths(destDir, tokens) {
  // Sólo los tokens que efectivamente aparecen en nombres de archivo/directorio
  // en templates/scaffold/ hoy: EXAMPLE_MODULE_NAME y EXAMPLE_MODULE_NAME_PASCAL.
  // Se recorre de más profundo a menos profundo para no invalidar paths de hijos
  // al renombrar un padre.
  const pathTokens = ['{{EXAMPLE_MODULE_NAME_PASCAL}}', '{{EXAMPLE_MODULE_NAME}}'];
  const all = listAllPaths(destDir).sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);

  for (const p of all) {
    if (!fs.existsSync(p)) continue; // pudo haberse movido ya como hijo de un renombre previo.
    const dir = path.dirname(p);
    const base = path.basename(p);
    let newBase = base;
    for (const token of pathTokens) {
      newBase = newBase.split(token).join(tokens[token]);
    }
    if (newBase !== base) {
      fs.renameSync(p, path.join(dir, newBase));
    }
  }
}

// Estos 4 tokens NUNCA se sustituyen — plan.md §0 los documenta explícitamente
// como "no son placeholders de instanciación" (son nombres de secretos de
// entorno / valores fijos que el propio §0 explica usando la sintaxis {{}}
// como ejemplo, no como algo a resolver). Verlos intactos en specs/ es
// correcto, no un residuo de instanciación.
const DOCUMENTATION_ONLY_TOKENS = new Set([
  '{{FRONTEND_PORT}}',
  '{{SERVER_PORT}}',
  '{{GOOGLE_CLIENT_ID}}',
  '{{AUTH_JWT_SECRET}}',
]);

function verifyNoLeftoverTokens(destDir) {
  const offenders = [];
  const TOKEN_RE = /\{\{[A-Z_]+\}\}/g;
  for (const file of listAllFiles(destDir)) {
    if (isBinaryLikely(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(TOKEN_RE);
    const real = matches ? [...new Set(matches)].filter((t) => !DOCUMENTATION_ONLY_TOKENS.has(t)) : [];
    if (real.length > 0) {
      offenders.push({ file: path.relative(destDir, file), tokens: real });
    }
  }
  for (const p of listAllPaths(destDir)) {
    if (TOKEN_RE.test(path.basename(p))) {
      offenders.push({ file: path.relative(destDir, p), tokens: ['(en el nombre del archivo/directorio)'] });
    }
    TOKEN_RE.lastIndex = 0;
  }
  return offenders;
}

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [projectName, destinationArg] = positional;

  if (!projectName) {
    fail('Falta {{PROJECT_NAME}}. Uso: node scripts/instantiate.mjs <project-name> [destination] [--example-module=name] [--allowed-domains=a.com,b.com]');
  }
  assertKebabCase(projectName, '{{PROJECT_NAME}}');

  const exampleModule = flags['example-module'] ?? 'example';
  assertKebabCase(exampleModule, '--example-module');

  const allowedDomains = flags['allowed-domains']
    ? flags['allowed-domains'].split(',').map((d) => d.trim()).filter(Boolean)
    : ['zeetrex.com'];
  if (allowedDomains.length === 0) fail('--allowed-domains no puede resolver a una lista vacía.');

  const destination = destinationArg
    ? path.resolve(process.cwd(), destinationArg)
    : path.resolve(REPO_ROOT, '..', projectName);

  if (fs.existsSync(destination)) {
    fail(`El destino ya existe: ${destination} — no se sobrescribe, elegí otro nombre/ruta o borralo primero.`);
  }
  if (!fs.existsSync(SCAFFOLD_DIR)) {
    fail(`No se encontró ${SCAFFOLD_DIR} — este script tiene que correr desde dentro de connexa-ia-template.`);
  }

  const tokens = deriveTokens({ projectName, exampleModule, allowedDomains });

  console.log(`Instanciando "${projectName}" en ${destination} ...`);
  fs.cpSync(SCAFFOLD_DIR, destination, { recursive: true });

  substituteContent(destination, tokens);
  renamePaths(destination, tokens);

  const offenders = verifyNoLeftoverTokens(destination);
  if (offenders.length > 0) {
    console.error('\n✖ Quedaron placeholders sin resolver — la instanciación no se puede dar por buena:\n');
    for (const { file, tokens: t } of offenders) {
      console.error(`  ${file}: ${t.join(', ')}`);
    }
    process.exit(1);
  }

  console.log('\n✓ Instanciación completa, sin placeholders pendientes.\n');
  console.log('Tokens resueltos:');
  for (const [token, value] of Object.entries(tokens)) {
    console.log(`  ${token} → ${value}`);
  }
  console.log(`\nPróximos pasos:\n`);
  console.log(`  cd ${path.relative(process.cwd(), destination) || '.'}`);
  console.log('  npm install');
  console.log('  npm test                 # unitarios sin Postgres, incl. module-boundaries.test.ts');
  console.log('  cp .env.example .env      # completar DATABASE_URL, AUTH_JWT_SECRET, GOOGLE_CLIENT_ID');
  console.log('  npm run migrate            # si hay Postgres local alcanzable');
  console.log('  npm run server && npm run dev   # backend :3001, frontend :5000\n');
}

main();
