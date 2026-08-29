# Plan técnico: Scaffold de app full-stack con arquitectura vertical-hexagonal por módulo

> **Nota sobre este documento**: a diferencia del `plan.md` estándar de SDD (que fija decisiones técnicas
> y deja el código para la fase de `tasks.md` — ver `requirements.md` §2 en §11.1 más abajo), este `plan.md`
> incluye código fuente completo. Es una excepción deliberada, propia de que este spec no describe una
> feature sino un scaffold: el objetivo es que se reproduzca igual en cada instanciación, sin margen de
> diseño para quien lo ejecute. No es el patrón a seguir en ningún spec posterior a `001`.

## 0. Placeholders — catálogo completo

**Lo único que hace falta preguntar al instanciar es `{{PROJECT_NAME}}`.** Todo lo demás se resuelve solo
— derivado mecánicamente, fijo, o con un default seguro que se puede pisar si hace falta. Esto es
deliberado: minimiza lo que un humano tiene que decidir para arrancar, y dos instanciaciones con el mismo
`{{PROJECT_NAME}}` (en momentos distintos, por agentes distintos) producen el mismo resultado.

| Placeholder | Cómo se resuelve | Ejemplo (`{{PROJECT_NAME}}` = `inventory-vision`) |
|---|---|---|
| `{{PROJECT_NAME}}` | **Se pregunta.** Único input real. | `inventory-vision` |
| `{{PROJECT_NAME_PASCAL}}` | Derivado: kebab-case → PascalCase. | `InventoryVision` |
| `{{PROJECT_NAME_TITLE}}` | Derivado: kebab-case → Título con espacios. | `Inventory Vision` |
| `{{FRONTEND_PORT}}` | **Fijo, siempre `5000`** — no es placeholder de verdad, es un valor literal en el código generado (ver nota abajo). | `5000` |
| `{{SERVER_PORT}}` | **Fijo, siempre `3001`** — ídem. | `3001` |
| `{{DATABASE_NAME}}` | Opcional. Default derivado: `{{PROJECT_NAME}}` en snake_case + `_dev`. Se puede pisar si hace falta. | `inventory_vision_dev` |
| `{{DB_SCHEMA}}` | Derivado: `{{PROJECT_NAME}}` en snake_case, sin sufijo (distinto de `{{DATABASE_NAME}}` — el schema aplica igual en dev y en producción, la base sólo en dev local). Nunca `public`. | `inventory_vision` |
| `{{ALLOWED_EMAIL_DOMAINS}}` | Default `['zeetrex.com']` — correcto tal cual para la mayoría de los proyectos internos; se pisa si el proyecto necesita otro dominio (u otros, sumando entradas al array), sin que eso bloquee la instanciación. | `['zeetrex.com']` |
| `{{EXAMPLE_MODULE_NAME}}` | Default `example` si no se especifica una entidad real del proyecto. | `example` |
| `{{EXAMPLE_MODULE_NAME_PASCAL}}` | Derivado de `{{EXAMPLE_MODULE_NAME}}` → PascalCase. | `Example` |
| `{{EXAMPLE_ENTITY_TABLE}}` | Igual a `{{EXAMPLE_MODULE_NAME}}` (snake_case ya coincide para una sola palabra). | `example` |
| `{{EXAMPLE_MODULE_PATH}}` | Derivado: pluralizar `{{EXAMPLE_MODULE_NAME}}` (`+s`, o `+es`/`y→ies` si aplica) — no se pregunta aparte, es la forma REST estándar del nombre. | `examples` |

**Nota sobre los puertos**: al ser un scaffold cuyo destino de producción es serverless (Vercel), el puerto
no existe como concepto en producción — sólo importa en desarrollo local, y ahí una colisión eventual con
otro proyecto corriendo al mismo tiempo se resuelve editando un número en 10 segundos. No amerita ser una
pregunta de instanciación ni una tabla de reservas: `{{FRONTEND_PORT}}`/`{{SERVER_PORT}}` no aparecen como
placeholders en el código generado (§5.1, §12.4, §14) — van con `5000`/`3001` literales directamente.

`{{GOOGLE_CLIENT_ID}}` y `{{AUTH_JWT_SECRET}}` **no son placeholders de instanciación de este documento**
— son secretos de entorno que cada instancia obtiene/genera por su cuenta (una consola de identidad OAuth
y `openssl rand -hex 32` respectivamente). El scaffold sólo deja las claves esperadas en `.env.example`.

---

## 1. Decisión arquitectónica: repo único full-stack, patrón de capas por módulo

Un repo, frontend Vite/React en `src/`, backend Express/TS en `server/`, Postgres compartido. La unidad de
organización del backend es el **módulo** (`server/modules/<módulo>/`), no la capa transversal — cada
módulo es un hexágono (Ports & Adapters) autocontenido en sus 4 subcarpetas (`ports`, `domain`, `infra`,
`api`), y sólo lo que es genuinamente transversal a todos los módulos vive en `server/platform/`.

Esta decisión (vertical por feature, en vez de horizontal por capa técnica global) se sostiene en tres
consecuencias prácticas, no en preferencia estética:

1. **Blast radius acotado**: tocar o borrar un módulo entero significa tocar o borrar una sola carpeta,
   no cazar sus archivos desperdigados en 4 carpetas técnicas distintas.
2. **Los límites son verificables por código**: con todo el dominio de un módulo agrupado en un
   directorio, un test puede leer sus imports y fallar si algo cruza el límite — ver §13.3
   (`module-boundaries.test.ts`). Con capas horizontales globales, esa regla no tiene un directorio
   natural que verificar.
3. **Cada módulo es, en principio, extraíble** — a otro servicio, a otro repo — sin arrastrar el resto.
   "En principio" hace falta calificarlo: la extraibilidad real depende de que el bajo acoplamiento y la
   dirección de dependencias (§4, RF-16) se sostengan en el código, no sólo en la forma de las carpetas. Un módulo puede *parecer*
   autocontenido por estar en su propia carpeta y sin embargo depender hacia atrás de otro módulo por un
   import de conveniencia — el síntoma no es un error de compilación, es que extraerlo rompe todo lo
   demás. Este scaffold aplica la regla desde el primer módulo, no la deja para revisar después.

```
{{PROJECT_NAME}}/
├── CLAUDE.md                        ← memoria del proyecto, ver §11
├── AGENTS.md                        ← puntero, ver §11
├── requirements.md                  ← acuerdos fundamentales, ver §11
├── README.md
├── package.json
├── tsconfig.json                    ← sólo src/ (frontend)
├── tsconfig.server.json             ← sólo server/ + api/ (backend)
├── vite.config.ts
├── vitest.config.ts
├── components.json                  ← config de shadcn/ui
├── .env.example
├── api/
│   └── index.ts                     ← entrypoint para el bundling serverless de Vercel
├── server/
│   ├── index.ts                     ← entrypoint local (npm run server) — única raíz de composición
│   ├── module-boundaries.test.ts    ← ver §13.3
│   ├── migrations/
│   │   ├── 0001_auth.sql
│   │   └── 0002_{{EXAMPLE_MODULE_NAME}}.sql
│   ├── platform/
│   │   ├── config/env.ts
│   │   ├── db/pool.ts
│   │   ├── db/transaction.ts        ← tipo Transaction, cross-cutting
│   │   ├── db/unit-of-work.ts
│   │   └── http/session.ts          ← firma/verifica JWT, cross-cutting (ver §4)
│   │   └── http/authenticate.ts
│   │   └── http/require-permission.ts
│   └── modules/
│       ├── auth/
│       │   ├── ports/{user,role}.repository.ts
│       │   ├── domain/{allowed-domains,errors}.ts
│       │   ├── infra/{in-memory-auth-store,user.repository.pg,user.repository.in-memory,role.repository.pg,role.repository.in-memory}.ts
│       │   ├── api/{auth,admin}.routes.ts
│       │   └── login.pg.test.ts
│       └── {{EXAMPLE_MODULE_NAME}}/
│           ├── ports/{{EXAMPLE_MODULE_NAME}}.repository.ts
│           ├── domain/{{EXAMPLE_MODULE_NAME}}.ts
│           ├── infra/{{EXAMPLE_MODULE_NAME}}.repository.{pg,in-memory}.ts
│           ├── api/{{EXAMPLE_MODULE_NAME}}.routes.ts
│           └── {{EXAMPLE_MODULE_NAME}}.test.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── lib/{api,auth-context,utils}.ts(x)
    └── components/{LoginButton,UsersView,RolesView,{{EXAMPLE_MODULE_NAME_PASCAL}}View}.tsx
```

## 2. Dependencias

### 2.1. `dependencies`

```json
{
  "express": "^5.2.1",
  "cors": "^2.8.6",
  "cookie-parser": "^1.4.7",
  "express-rate-limit": "^8.5.2",
  "pg": "^8.21.0",
  "dotenv": "^17.4.2",
  "zod": "^3.25.76",
  "jsonwebtoken": "^9.0.3",
  "google-auth-library": "^10.9.1",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-error-boundary": "^6.0.0",
  "@tanstack/react-query": "^5.83.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.0.2",
  "class-variance-authority": "^0.7.1",
  "lucide-react": "^0.484.0",
  "@radix-ui/react-dialog": "^1.1.6",
  "@radix-ui/react-checkbox": "^1.1.4",
  "@radix-ui/react-label": "^2.1.2",
  "@radix-ui/react-slot": "^1.1.2",
  "@radix-ui/react-switch": "^1.1.3",
  "@radix-ui/react-dropdown-menu": "^2.1.6",
  "tw-animate-css": "^1.2.4"
}
```

`@tanstack/react-query` centraliza loading/error/cache de datos remotos, en vez de manejarlo a mano por
componente. Las 5 dependencias `@radix-ui/*` son las que efectivamente usan los componentes escritos en
este documento (`Dialog`, `Checkbox`, `Label`, `Switch`, y `Slot` para `Button`/`Badge`) — van fijas porque
el código de §10 ya se comprometió a usarlas, no es especulativo. `Badge` no necesita un paquete Radix
propio (es un `<span>` con variantes de `class-variance-authority`, reutiliza `Slot`). `tw-animate-css` la
usa el sistema de diseño (§10.10) para las transiciones de componentes como `Dialog`/`Sidebar`. Si un
módulo nuevo necesita un primitivo de shadcn adicional (`Select`, `Tabs`, etc.), se suma en ese momento —
no se fija de antemano una lista de ~20 paquetes "por si acaso".

### 2.2. `devDependencies`

```json
{
  "typescript": "~5.7.2",
  "tsx": "^4.22.4",
  "vite": "^7.3.2",
  "@vitejs/plugin-react-swc": "^4.2.2",
  "vitest": "^4.1.10",
  "node-pg-migrate": "^9.0.0",
  "tailwindcss": "^4.1.11",
  "@tailwindcss/vite": "^4.1.11",
  "eslint": "^9.28.0",
  "typescript-eslint": "^8.38.0",
  "@types/node": "^25.9.1",
  "@types/express": "^5.0.6",
  "@types/cors": "^2.8.19",
  "@types/cookie-parser": "^1.4.10",
  "@types/jsonwebtoken": "^9.0.10",
  "@types/pg": "^8.20.0",
  "@types/react": "^19.0.10",
  "@types/react-dom": "^19.0.4"
}
```

## 3. Convenciones (detalle de implementación)

- **IDs**: `BIGSERIAL`/`BIGINT` en Postgres, `number` en TS/JSON — no UUID, decisión explícita justificada
  en `spec.md` §6 (mejor localidad de índice y mitad de espacio para un monolito sin réplica entre
  sistemas; la protección de acceso real es `authenticate`+`requirePermission`, no la unicidad del ID).
  `node-postgres` devuelve `BIGINT`/`BIGSERIAL` como `string` — todo mapper de fila pasa el campo por un
  helper `num()`:
  ```ts
  function num(v: unknown): number {
    return typeof v === 'string' ? Number(v) : (v as number);
  }
  ```
- **Migraciones**: `server/migrations/NNNN_slug.sql`, con bloques `-- Up Migration` / `-- Down Migration`
  explícitos, corridas por `node-pg-migrate -m server/migrations --schema {{DB_SCHEMA}} --create-schema
  up`. Aditivas por defecto.
- **Schema de Postgres propio por proyecto, nunca `public`**: todas las tablas viven en `{{DB_SCHEMA}}`
  (derivado del nombre del proyecto — §0). Se logra sin tocar el SQL de ninguna migración: `--schema
  {{DB_SCHEMA}} --create-schema` en el comando de `node-pg-migrate` fija el `search_path` de la corrida y
  crea el schema si no existe (incluida la tabla de tracking de migraciones, que también queda ahí adentro
  — no en `public`); el pool de runtime (§5.2) fija el mismo `search_path` en cada conexión. Ningún nombre
  de tabla necesita ir calificado con el schema en ningún `CREATE TABLE` ni query.
- **Catálogo de permisos plano**: tabla `permission(code TEXT PK, description TEXT)`, formato
  `recurso.acción[.calificador]`. Agregar un permiso nuevo es una fila de seed en una migración futura,
  no una tabla normalizada `resource`×`action`.
- **Transacción por-caso-de-uso**: `withTransaction(fn)` — `BEGIN` → `fn(tx)` → `COMMIT` si no lanza,
  `ROLLBACK` si lanza, siempre libera el client. Ninguna ruta ni caso de uso abre su propia transacción.
- **Doble repo por puerto**: `*.repository.pg.ts` (SQL real) + `*.repository.in-memory.ts` (`Map`), misma
  interfaz — el segundo corre en tests sin Postgres.
- **Store compartido cuando dos repos tocan las mismas tablas**: ver `infra/in-memory-auth-store.ts` en
  §6 — `UserRepository` y `RoleRepository` en memoria comparten instancia para que un chequeo tipo "¿el rol
  tiene usuarios asignados?" vea lo que escribió el otro repo.
- **Errores de dominio como clases**: `class XError extends Error` en `domain/errors.ts`; la capa `api/`
  los traduce a status HTTP con `instanceof`, nunca parseando `err.message`.
- **Validación de body con Zod inline** en cada `Router`, no clases DTO separadas.
- **Config de entorno validada al import** (`server/platform/config/env.ts`, con Zod) — falla cerrado
  antes de levantar el server, no en el primer request que la necesite.

## 4. Bajo acoplamiento y dirección de dependencias entre módulos (RF-16) — cómo se sostiene en el código

Dos principios de diseño de paquetes, no una regla inventada para este scaffold: **bajo acoplamiento**
(ningún módulo importa `ports/domain/infra/api` de otro módulo de dominio) y **dirección de dependencias
hacia la capa estable** (*Stable Dependencies Principle*, Robert C. Martin — `platform/` es lo más estable
del sistema, así que las dependencias sólo pueden apuntar hacia ahí, nunca al revés). Es más estricto que
el *Acyclic Dependencies Principle* clásico: no alcanza con prohibir ciclos, se prohíbe directamente
cualquier dependencia módulo→módulo — porque el objetivo es que cada módulo sea extraíble solo, no sólo
que el grafo de dependencias no tenga vueltas.

Es fácil romper esto sin darse cuenta apenas dos módulos comparten algo que *parece* pertenecerle a uno de
ellos. Dos decisiones de diseño concretas lo sostienen desde el primer módulo generado:

**a) El tipo `Transaction` vive en `platform/db/`, no en ningún módulo.** Es el contrato de "algo contra
lo que puedo correr una query dentro de una transacción" — genuinamente transversal, no le pertenece al
dominio de auth ni al del módulo de ejemplo ni al de ningún módulo futuro. Definirlo dentro de un módulo
(aunque sea el primero que se escriba) fuerza a todos los módulos siguientes a importarlo de ahí, creando
una dependencia real hacia ese módulo aunque conceptualmente no tengan nada que ver con él.

```ts
// server/platform/db/transaction.ts
import type { QueryResult, QueryResultRow } from 'pg';

export interface Transaction {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
}
```

**b) La verificación de sesión vive en `platform/http/`, la emisión vive en el módulo de auth.** El
middleware `authenticate` se monta globalmente (`app.use('/api', authenticate)`, ver §9) — lo atraviesa
*toda* ruta de *todo* módulo. Verificar un JWT sólo necesita el secreto compartido (`AUTH_JWT_SECRET`); no
necesita nada más del módulo que emite sesiones. Si la función de verificación viviera dentro del módulo
de auth, `platform/` (del que depende todo el resto de la app) dependería hacia atrás de un módulo de
dominio — la dirección de dependencia prohibida por RF-16. La firma (usada sólo por el login) sí puede
convivir en el mismo archivo, porque firmar y verificar son las dos mitades del mismo mecanismo
criptográfico, con el mismo secreto — separarlas en dos lugares distintos no ganaría nada.

```ts
// server/platform/http/session.ts
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface SessionPayload {
  sub: number;
  email: string;
  permissions: string[];
}

const TTL = '8h'; // Fijo, sin refresh en v1 — ver requirements.md §3.

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.AUTH_JWT_SECRET, { expiresIn: TTL });
}

export function verifySession(token: string): SessionPayload {
  const decoded = jwt.verify(token, env.AUTH_JWT_SECRET);
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>).sub !== 'number' ||
    typeof (decoded as Record<string, unknown>).email !== 'string' ||
    !Array.isArray((decoded as Record<string, unknown>).permissions)
  ) {
    throw new Error('JWT payload con forma inesperada');
  }
  return decoded as unknown as SessionPayload;
}
```

Con esto, `server/modules/auth/api/auth.routes.ts` **importa** `signSession` desde `platform/` (dirección
permitida: módulo → platform), y `server/platform/http/authenticate.ts` importa `verifySession` del mismo
archivo, sin tocar nada de `modules/auth/` (§5.4). Ninguna dependencia cruza de `platform/` hacia un
módulo, en ninguna dirección.

**Regla general para cualquier módulo nuevo que se agregue después de este scaffold**: antes de poner algo
en `domain/` o `infra/` de un módulo, preguntar "¿esto lo va a necesitar sólo este módulo, o cualquier
módulo futuro?". Si la respuesta es "cualquiera", va en `platform/`, aunque hoy sólo lo use uno. La señal
de alarma es exactamente lo que pasó con `Transaction` y `verifySession` en la formulación ingenua de este
patrón: un tipo o función transversal que se queda en el primer módulo que lo necesitó, "porque ahí estaba
el código cuando hizo falta".

Distinto es el caso de un módulo que necesita algo de **otro módulo de dominio específico** (no algo
transversal a todos) — eso no va en `platform/`, y no es una violación a tolerar en silencio tampoco. Ver
`requirements.md` §4.1 (§11.1 más abajo) para el criterio completo.

## 5. `server/platform/` — capa transversal

### 5.1. `config/env.ts`

```ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: z.enum(['require', 'disable', 'verify-full']).default('require'),
  PORT: z.coerce.number().int().positive().default(3001),
  AUTH_JWT_SECRET: z.string().min(32, 'AUTH_JWT_SECRET debe tener al menos 32 caracteres'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

export const env = loadEnv();
```

### 5.2. `db/pool.ts`

```ts
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
```

### 5.3. `db/unit-of-work.ts`

```ts
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
```

### 5.4. `http/authenticate.ts`

```ts
import type { Request, Response, NextFunction } from 'express';
import { verifySession } from './session.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; permissions: string[] };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.{{PROJECT_NAME_PASCAL}}_session as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  try {
    const payload = verifySession(token);
    req.user = { id: payload.sub, email: payload.email, permissions: payload.permissions };
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o vencida' });
  }
}
```

Nótese el import: `./session.js`, dentro del propio `platform/http/` — no `../../modules/auth/...`. Este
es el punto exacto que sostiene RF-16 para el mecanismo de sesión (§4b).

### 5.5. `http/require-permission.ts`

```ts
import type { Request, Response, NextFunction } from 'express';

export function requirePermission(code: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.permissions.includes(code)) {
      res.status(403).json({ error: `Falta el permiso ${code}` });
      return;
    }
    next();
  };
}
```

## 6. Módulo `auth` — login, sesión, ABM de usuarios y roles

### 6.1. `ports/user.repository.ts`

```ts
import type { Transaction } from '../../../platform/db/transaction.js';

export interface AppUser {
  id: number;
  googleSub: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  active: boolean;
}

export interface UserWithRoles extends AppUser {
  roles: { id: number; name: string }[];
}

export interface NewUser {
  googleSub: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  active: boolean;
}

export interface UserRepository {
  findByGoogleSub(tx: Transaction, googleSub: string): Promise<AppUser | null>;
  isEmpty(tx: Transaction): Promise<boolean>;
  createUser(tx: Transaction, input: NewUser): Promise<AppUser>;
  assignRole(tx: Transaction, userId: number, roleId: number): Promise<void>;
  setRoles(tx: Transaction, userId: number, roleIds: number[]): Promise<void>;
  setActive(tx: Transaction, userId: number, active: boolean): Promise<void>;
  resolvePermissions(tx: Transaction, userId: number): Promise<string[]>;
  touchLastLogin(tx: Transaction, userId: number): Promise<void>;
  listUsers(tx: Transaction): Promise<UserWithRoles[]>;
  findRoleIdByName(tx: Transaction, name: string): Promise<number | null>;
}
```

### 6.2. `ports/role.repository.ts`

```ts
import type { Transaction } from '../../../platform/db/transaction.js';

export interface RoleWithPermissions {
  id: number;
  name: string;
  description: string;
  active: boolean;
  /** true sólo en el rol semilla (Admin) — flag, nunca por nombre. */
  protected: boolean;
  userCount: number;
  permissions: string[];
}

export interface NewRole {
  name: string;
  description: string;
  permissionCodes: string[];
}

export interface RoleRepository {
  listRoles(tx: Transaction): Promise<RoleWithPermissions[]>;
  createRole(tx: Transaction, input: NewRole): Promise<RoleWithPermissions>;
  /** Lanza `ProtectedRoleError` si `protected = true`. */
  updateRole(tx: Transaction, id: number, input: Partial<NewRole>): Promise<RoleWithPermissions>;
  /** Lanza `ProtectedRoleError` si `protected`, `RoleInUseError` si tiene usuarios asignados. */
  deleteRole(tx: Transaction, id: number): Promise<void>;
  listPermissionCodes(tx: Transaction): Promise<string[]>;
  listPermissions(tx: Transaction): Promise<{ code: string; description: string }[]>;
}
```

### 6.3. `domain/allowed-domains.ts`

```ts
export const ALLOWED_EMAIL_DOMAINS = {{ALLOWED_EMAIL_DOMAINS}} as const;

export function isAllowedEmail(email: string, emailVerified: boolean): boolean {
  if (!emailVerified) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain as (typeof ALLOWED_EMAIL_DOMAINS)[number]);
}
```

### 6.4. `domain/errors.ts`

```ts
export class RoleInUseError extends Error {
  constructor(public readonly roleId: number) {
    super(`El rol ${roleId} tiene usuarios asignados y no se puede borrar`);
    this.name = 'RoleInUseError';
  }
}

export class ProtectedRoleError extends Error {
  constructor(public readonly roleId: number) {
    super(`El rol ${roleId} está protegido y no se puede editar ni borrar`);
    this.name = 'ProtectedRoleError';
  }
}
```

### 6.5. `infra/in-memory-auth-store.ts`

```ts
// UserRepository y RoleRepository en memoria implementan ports distintos,
// pero en Postgres las dos leen/escriben las mismas tablas puente
// (user_role) — un store compartido por referencia evita que, por ejemplo,
// deleteRole() no vea las asignaciones que hizo InMemoryUserRepository.
export interface StoredUser {
  id: number;
  googleSub: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  active: boolean;
  lastLoginAt: Date | null;
}

export interface StoredRole {
  id: number;
  name: string;
  description: string;
  active: boolean;
  protected: boolean;
  permissionCodes: Set<string>;
}

export class InMemoryAuthStore {
  nextId = 1;
  usersById = new Map<number, StoredUser>();
  usersByGoogleSub = new Map<string, number>();
  rolesById = new Map<number, StoredRole>();
  userRoles = new Map<number, Set<number>>();
}
```

### 6.6. `infra/user.repository.pg.ts`

```ts
import type { Transaction } from '../../../platform/db/transaction.js';
import type { AppUser, NewUser, UserRepository, UserWithRoles } from '../ports/user.repository.js';

function num(v: unknown): number {
  return typeof v === 'string' ? Number(v) : (v as number);
}

async function one<T>(tx: Transaction, sql: string, params: unknown[]): Promise<T | undefined> {
  const { rows } = await tx.query(sql, params);
  return rows[0] as T | undefined;
}

interface UserRow {
  id: number | string;
  google_sub: string;
  email: string;
  name: string;
  picture_url: string | null;
  active: boolean;
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: num(row.id),
    googleSub: row.google_sub,
    email: row.email,
    name: row.name,
    pictureUrl: row.picture_url,
    active: row.active,
  };
}

const USER_COLUMNS = 'id, google_sub, email, name, picture_url, active';

export class PgUserRepository implements UserRepository {
  async findByGoogleSub(tx: Transaction, googleSub: string): Promise<AppUser | null> {
    const row = await one<UserRow>(tx, `SELECT ${USER_COLUMNS} FROM app_user WHERE google_sub = $1`, [googleSub]);
    return row ? toAppUser(row) : null;
  }

  async isEmpty(tx: Transaction): Promise<boolean> {
    const row = await one<{ count: string }>(tx, 'SELECT count(*) AS count FROM app_user', []);
    return num(row?.count ?? 0) === 0;
  }

  async createUser(tx: Transaction, input: NewUser): Promise<AppUser> {
    const row = await one<UserRow>(
      tx,
      `INSERT INTO app_user (google_sub, email, name, picture_url, active)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${USER_COLUMNS}`,
      [input.googleSub, input.email, input.name, input.pictureUrl, input.active],
    );
    return toAppUser(row!);
  }

  async assignRole(tx: Transaction, userId: number, roleId: number): Promise<void> {
    await tx.query(
      `INSERT INTO user_role (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId],
    );
  }

  async setRoles(tx: Transaction, userId: number, roleIds: number[]): Promise<void> {
    await tx.query('DELETE FROM user_role WHERE user_id = $1', [userId]);
    for (const roleId of roleIds) {
      await tx.query('INSERT INTO user_role (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
    }
  }

  async setActive(tx: Transaction, userId: number, active: boolean): Promise<void> {
    await tx.query('UPDATE app_user SET active = $2 WHERE id = $1', [userId, active]);
  }

  async resolvePermissions(tx: Transaction, userId: number): Promise<string[]> {
    const { rows } = await tx.query(
      `SELECT DISTINCT rp.permission_code FROM user_role ur
         JOIN role_permission rp ON rp.role_id = ur.role_id WHERE ur.user_id = $1`,
      [userId],
    );
    return (rows as { permission_code: string }[]).map((r) => r.permission_code);
  }

  async touchLastLogin(tx: Transaction, userId: number): Promise<void> {
    await tx.query('UPDATE app_user SET last_login_at = NOW() WHERE id = $1', [userId]);
  }

  async listUsers(tx: Transaction): Promise<UserWithRoles[]> {
    const { rows } = await tx.query(
      `SELECT u.id, u.google_sub, u.email, u.name, u.picture_url, u.active,
              COALESCE(json_agg(json_build_object('id', r.id, 'name', r.name) ORDER BY r.name)
                FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
         FROM app_user u
         LEFT JOIN user_role ur ON ur.user_id = u.id
         LEFT JOIN role r ON r.id = ur.role_id
        GROUP BY u.id ORDER BY u.email`,
      [],
    );
    return (rows as (UserRow & { roles: { id: number; name: string }[] })[]).map((row) => ({
      ...toAppUser(row),
      roles: row.roles,
    }));
  }

  async findRoleIdByName(tx: Transaction, name: string): Promise<number | null> {
    const row = await one<{ id: string }>(tx, 'SELECT id FROM role WHERE name = $1', [name]);
    return row ? num(row.id) : null;
  }
}
```

### 6.7. `infra/user.repository.in-memory.ts`

```ts
import type { Transaction } from '../../../platform/db/transaction.js';
import type { AppUser, NewUser, UserRepository, UserWithRoles } from '../ports/user.repository.js';
import { InMemoryAuthStore, type StoredUser } from './in-memory-auth-store.js';

function toAppUser(u: StoredUser): AppUser {
  return { id: u.id, googleSub: u.googleSub, email: u.email, name: u.name, pictureUrl: u.pictureUrl, active: u.active };
}

export class InMemoryUserRepository implements UserRepository {
  constructor(private store: InMemoryAuthStore = new InMemoryAuthStore()) {}

  async findByGoogleSub(_tx: Transaction, googleSub: string): Promise<AppUser | null> {
    const id = this.store.usersByGoogleSub.get(googleSub);
    if (id == null) return null;
    const u = this.store.usersById.get(id);
    return u ? toAppUser(u) : null;
  }

  async isEmpty(_tx: Transaction): Promise<boolean> {
    return this.store.usersById.size === 0;
  }

  async createUser(_tx: Transaction, input: NewUser): Promise<AppUser> {
    const user: StoredUser = { id: this.store.nextId++, ...input, lastLoginAt: null };
    this.store.usersById.set(user.id, user);
    this.store.usersByGoogleSub.set(user.googleSub, user.id);
    return toAppUser(user);
  }

  async assignRole(_tx: Transaction, userId: number, roleId: number): Promise<void> {
    const roles = this.store.userRoles.get(userId) ?? new Set<number>();
    roles.add(roleId);
    this.store.userRoles.set(userId, roles);
  }

  async setRoles(_tx: Transaction, userId: number, roleIds: number[]): Promise<void> {
    this.store.userRoles.set(userId, new Set(roleIds));
  }

  async setActive(_tx: Transaction, userId: number, active: boolean): Promise<void> {
    const u = this.store.usersById.get(userId);
    if (u) u.active = active;
  }

  async resolvePermissions(_tx: Transaction, userId: number): Promise<string[]> {
    const roleIds = this.store.userRoles.get(userId) ?? new Set<number>();
    const permissions = new Set<string>();
    for (const roleId of roleIds) {
      const role = this.store.rolesById.get(roleId);
      if (!role) continue;
      for (const code of role.permissionCodes) permissions.add(code);
    }
    return [...permissions];
  }

  async touchLastLogin(_tx: Transaction, userId: number): Promise<void> {
    const u = this.store.usersById.get(userId);
    if (u) u.lastLoginAt = new Date();
  }

  async listUsers(_tx: Transaction): Promise<UserWithRoles[]> {
    return [...this.store.usersById.values()].map((u) => ({
      ...toAppUser(u),
      roles: [...(this.store.userRoles.get(u.id) ?? [])]
        .map((roleId) => this.store.rolesById.get(roleId))
        .filter((r): r is NonNullable<typeof r> => r != null)
        .map((r) => ({ id: r.id, name: r.name })),
    }));
  }

  async findRoleIdByName(_tx: Transaction, name: string): Promise<number | null> {
    for (const role of this.store.rolesById.values()) if (role.name === name) return role.id;
    return null;
  }
}
```

### 6.8. `infra/role.repository.pg.ts`

```ts
import type { Transaction } from '../../../platform/db/transaction.js';
import { ProtectedRoleError, RoleInUseError } from '../domain/errors.js';
import type { NewRole, RoleRepository, RoleWithPermissions } from '../ports/role.repository.js';

function num(v: unknown): number {
  return typeof v === 'string' ? Number(v) : (v as number);
}

async function one<T>(tx: Transaction, sql: string, params: unknown[]): Promise<T | undefined> {
  const { rows } = await tx.query(sql, params);
  return rows[0] as T | undefined;
}

interface RoleRow {
  id: number | string;
  name: string;
  description: string;
  active: boolean;
  protected: boolean;
}

function toRoleWithPermissions(row: RoleRow, permissions: string[], userCount: number): RoleWithPermissions {
  return { id: num(row.id), name: row.name, description: row.description, active: row.active, protected: row.protected, userCount, permissions };
}

async function assertNotProtected(tx: Transaction, id: number): Promise<void> {
  const row = await one<{ protected: boolean }>(tx, 'SELECT protected FROM role WHERE id = $1', [id]);
  if (row?.protected) throw new ProtectedRoleError(id);
}

async function permissionsFor(tx: Transaction, roleId: number): Promise<string[]> {
  const { rows } = await tx.query('SELECT permission_code FROM role_permission WHERE role_id = $1 ORDER BY permission_code', [roleId]);
  return (rows as { permission_code: string }[]).map((r) => r.permission_code);
}

export class PgRoleRepository implements RoleRepository {
  async listRoles(tx: Transaction): Promise<RoleWithPermissions[]> {
    const { rows } = await tx.query(
      `SELECT r.id, r.name, r.description, r.active, r.protected,
              COUNT(DISTINCT ur.user_id) AS user_count,
              COALESCE(json_agg(DISTINCT rp.permission_code) FILTER (WHERE rp.permission_code IS NOT NULL), '[]') AS permissions
         FROM role r
         LEFT JOIN role_permission rp ON rp.role_id = r.id
         LEFT JOIN user_role ur ON ur.role_id = r.id
        GROUP BY r.id ORDER BY r.name`,
      [],
    );
    return (rows as (RoleRow & { user_count: string; permissions: string[] })[]).map((row) =>
      toRoleWithPermissions(row, [...row.permissions].sort(), num(row.user_count)),
    );
  }

  async createRole(tx: Transaction, input: NewRole): Promise<RoleWithPermissions> {
    const row = await one<RoleRow>(
      tx,
      'INSERT INTO role (name, description) VALUES ($1, $2) RETURNING id, name, description, active, protected',
      [input.name, input.description],
    );
    const roleId = num(row!.id);
    for (const code of input.permissionCodes) {
      await tx.query('INSERT INTO role_permission (role_id, permission_code) VALUES ($1, $2)', [roleId, code]);
    }
    return toRoleWithPermissions({ ...row!, id: roleId }, [...input.permissionCodes].sort(), 0);
  }

  async updateRole(tx: Transaction, id: number, input: Partial<NewRole>): Promise<RoleWithPermissions> {
    await assertNotProtected(tx, id);
    if (input.name != null || input.description != null) {
      await tx.query('UPDATE role SET name = COALESCE($2, name), description = COALESCE($3, description) WHERE id = $1', [id, input.name ?? null, input.description ?? null]);
    }
    if (input.permissionCodes != null) {
      await tx.query('DELETE FROM role_permission WHERE role_id = $1', [id]);
      for (const code of input.permissionCodes) {
        await tx.query('INSERT INTO role_permission (role_id, permission_code) VALUES ($1, $2)', [id, code]);
      }
    }
    const row = await one<RoleRow>(tx, 'SELECT id, name, description, active, protected FROM role WHERE id = $1', [id]);
    if (!row) throw new Error(`Rol ${id} no encontrado`);
    const userCountRow = await one<{ count: string }>(tx, 'SELECT count(*) AS count FROM user_role WHERE role_id = $1', [id]);
    return toRoleWithPermissions(row, await permissionsFor(tx, id), num(userCountRow?.count ?? 0));
  }

  async deleteRole(tx: Transaction, id: number): Promise<void> {
    await assertNotProtected(tx, id);
    // Chequeo explícito en la app, no ON DELETE RESTRICT de esquema: role_permission
    // sí debe cascadear, sólo user_role necesita frenar el borrado.
    const referenced = await one<{ count: string }>(tx, 'SELECT count(*) AS count FROM user_role WHERE role_id = $1', [id]);
    if (num(referenced?.count ?? 0) > 0) throw new RoleInUseError(id);
    await tx.query('DELETE FROM role WHERE id = $1', [id]);
  }

  async listPermissionCodes(tx: Transaction): Promise<string[]> {
    const { rows } = await tx.query('SELECT code FROM permission ORDER BY code', []);
    return (rows as { code: string }[]).map((r) => r.code);
  }

  async listPermissions(tx: Transaction): Promise<{ code: string; description: string }[]> {
    const { rows } = await tx.query('SELECT code, description FROM permission ORDER BY code', []);
    return rows as { code: string; description: string }[];
  }
}
```

### 6.9. `infra/role.repository.in-memory.ts`

```ts
import type { Transaction } from '../../../platform/db/transaction.js';
import { ProtectedRoleError, RoleInUseError } from '../domain/errors.js';
import type { NewRole, RoleRepository, RoleWithPermissions } from '../ports/role.repository.js';
import { InMemoryAuthStore, type StoredRole } from './in-memory-auth-store.js';

function toRoleWithPermissions(role: StoredRole, store: InMemoryAuthStore): RoleWithPermissions {
  let userCount = 0;
  for (const roles of store.userRoles.values()) if (roles.has(role.id)) userCount++;
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    active: role.active,
    protected: role.protected,
    userCount,
    permissions: [...role.permissionCodes].sort(),
  };
}

export class InMemoryRoleRepository implements RoleRepository {
  constructor(private store: InMemoryAuthStore = new InMemoryAuthStore()) {}

  async listRoles(_tx: Transaction): Promise<RoleWithPermissions[]> {
    return [...this.store.rolesById.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => toRoleWithPermissions(r, this.store));
  }

  async createRole(_tx: Transaction, input: NewRole): Promise<RoleWithPermissions> {
    const role: StoredRole = {
      id: this.store.nextId++,
      name: input.name,
      description: input.description,
      active: true,
      protected: false,
      permissionCodes: new Set(input.permissionCodes),
    };
    this.store.rolesById.set(role.id, role);
    return toRoleWithPermissions(role, this.store);
  }

  async updateRole(_tx: Transaction, id: number, input: Partial<NewRole>): Promise<RoleWithPermissions> {
    const role = this.store.rolesById.get(id);
    if (!role) throw new Error(`Rol ${id} no encontrado`);
    if (role.protected) throw new ProtectedRoleError(id);
    if (input.name != null) role.name = input.name;
    if (input.description != null) role.description = input.description;
    if (input.permissionCodes != null) role.permissionCodes = new Set(input.permissionCodes);
    return toRoleWithPermissions(role, this.store);
  }

  async deleteRole(_tx: Transaction, id: number): Promise<void> {
    const role = this.store.rolesById.get(id);
    if (!role) return;
    if (role.protected) throw new ProtectedRoleError(id);
    for (const roles of this.store.userRoles.values()) {
      if (roles.has(id)) throw new RoleInUseError(id);
    }
    this.store.rolesById.delete(id);
  }

  async listPermissionCodes(_tx: Transaction): Promise<string[]> {
    const codes = new Set<string>();
    for (const role of this.store.rolesById.values()) for (const c of role.permissionCodes) codes.add(c);
    return [...codes].sort();
  }

  async listPermissions(tx: Transaction): Promise<{ code: string; description: string }[]> {
    return (await this.listPermissionCodes(tx)).map((code) => ({ code, description: '' }));
  }
}
```

### 6.10. `api/auth.routes.ts`

```ts
import { Router, Request, Response } from 'express';
import type { CookieOptions } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../platform/config/env.js';
import { withTransaction } from '../../../platform/db/unit-of-work.js';
import { signSession } from '../../../platform/http/session.js';
import { authenticate } from '../../../platform/http/authenticate.js';
import { isAllowedEmail } from '../domain/allowed-domains.js';
import { PgUserRepository } from '../infra/user.repository.pg.js';
import type { AppUser } from '../ports/user.repository.js';

const router = Router();
const userRepo = new PgUserRepository();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const COOKIE_NAME = '{{PROJECT_NAME_PASCAL}}_session';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000,
};

function toUserJson(user: AppUser) {
  return { id: user.id, email: user.email, name: user.name, pictureUrl: user.pictureUrl };
}

// POST /api/auth/google — el filtro de dominio corre antes que cualquier
// otra cosa, sin excepción ni para el bootstrap del primer usuario.
router.post('/google', async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) {
    res.status(400).json({ error: 'Falta idToken' });
    return;
  }

  let email: string | undefined;
  let emailVerified = false;
  let googleSub: string | undefined;
  let name = '';
  let picture: string | null = null;

  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    const claims = ticket.getPayload();
    email = claims?.email;
    emailVerified = claims?.email_verified === true;
    googleSub = claims?.sub;
    name = claims?.name ?? '';
    picture = claims?.picture ?? null;
  } catch (err) {
    console.error('POST /api/auth/google — verifyIdToken falló:', err);
    res.status(401).json({ error: 'Token de Google inválido' });
    return;
  }

  if (!email || !googleSub) {
    res.status(401).json({ error: 'Token de Google inválido' });
    return;
  }

  if (!isAllowedEmail(email, emailVerified)) {
    res.status(403).json({ error: 'Dominio no autorizado' });
    return;
  }

  try {
    await withTransaction(async (tx) => {
      let user = await userRepo.findByGoogleSub(tx, googleSub!);
      if (!user) {
        const isFirst = await userRepo.isEmpty(tx);
        user = await userRepo.createUser(tx, { googleSub: googleSub!, email, name, pictureUrl: picture, active: isFirst });
        if (isFirst) {
          const adminRoleId = await userRepo.findRoleIdByName(tx, 'Admin');
          if (adminRoleId != null) await userRepo.assignRole(tx, user.id, adminRoleId);
        }
      }

      if (!user.active) {
        res.status(403).json({ error: 'Usuario inactivo, esperando activación' });
        return;
      }

      const permissions = await userRepo.resolvePermissions(tx, user.id);
      await userRepo.touchLastLogin(tx, user.id);
      const token = signSession({ sub: user.id, email: user.email, permissions });
      res.cookie(COOKIE_NAME, token, cookieOptions);
      res.json({ user: toUserJson(user), permissions });
    });
  } catch (err) {
    console.error('POST /api/auth/google error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.status(204).end();
});

router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: { id: req.user!.id, email: req.user!.email }, permissions: req.user!.permissions });
});

export default router;
```

### 6.11. `api/admin.routes.ts`

```ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { withTransaction } from '../../../platform/db/unit-of-work.js';
import { requirePermission } from '../../../platform/http/require-permission.js';
import { ProtectedRoleError, RoleInUseError } from '../domain/errors.js';
import { PgRoleRepository } from '../infra/role.repository.pg.js';
import { PgUserRepository } from '../infra/user.repository.pg.js';

const router = Router();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

function sendError(res: Response, status: number, message: string, route: string, err: unknown) {
  console.error(`${route} error:`, err);
  res.status(status).json({ error: message });
}

router.get('/users', requirePermission('user.view'), async (_req: Request, res: Response) => {
  try {
    const users = await withTransaction((tx) => userRepo.listUsers(tx));
    res.json(users);
  } catch (err) {
    sendError(res, 500, 'Error al listar usuarios', 'GET /api/admin/users', err);
  }
});

const patchUserSchema = z.object({
  active: z.boolean().optional(),
  roleIds: z.array(z.number().int().positive()).optional(),
});

router.patch('/users/:id', requirePermission('user.edit'), async (req: Request<{ id: string }>, res: Response) => {
  const userId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(userId)) { res.status(400).json({ error: 'id inválido' }); return; }
  const parsed = patchUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  try {
    await withTransaction(async (tx) => {
      if (parsed.data.active != null) await userRepo.setActive(tx, userId, parsed.data.active);
      if (parsed.data.roleIds != null) await userRepo.setRoles(tx, userId, parsed.data.roleIds);
    });
    const users = await withTransaction((tx) => userRepo.listUsers(tx));
    const updated = users.find((u) => u.id === userId);
    if (!updated) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    res.json(updated);
  } catch (err) {
    sendError(res, 500, 'Error al actualizar el usuario', 'PATCH /api/admin/users/:id', err);
  }
});

router.get('/roles', requirePermission('role.view'), async (_req: Request, res: Response) => {
  try {
    const roles = await withTransaction((tx) => roleRepo.listRoles(tx));
    res.json(roles);
  } catch (err) {
    sendError(res, 500, 'Error al listar roles', 'GET /api/admin/roles', err);
  }
});

const roleBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  permissionCodes: z.array(z.string()),
});

async function validatePermissionCodes(codes: string[]): Promise<string[]> {
  const catalog = new Set(await withTransaction((tx) => roleRepo.listPermissionCodes(tx)));
  return codes.filter((c) => !catalog.has(c));
}

router.post('/roles', requirePermission('role.create'), async (req: Request, res: Response) => {
  const parsed = roleBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  const unknown = await validatePermissionCodes(parsed.data.permissionCodes);
  if (unknown.length > 0) { res.status(400).json({ error: `Códigos de permiso desconocidos: ${unknown.join(', ')}` }); return; }
  try {
    const role = await withTransaction((tx) => roleRepo.createRole(tx, parsed.data));
    res.status(201).json(role);
  } catch (err) {
    sendError(res, 500, 'Error al crear el rol', 'POST /api/admin/roles', err);
  }
});

const roleUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissionCodes: z.array(z.string()).optional(),
});

router.put('/roles/:id', requirePermission('role.edit'), async (req: Request<{ id: string }>, res: Response) => {
  const roleId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(roleId)) { res.status(400).json({ error: 'id inválido' }); return; }
  const parsed = roleUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  if (parsed.data.permissionCodes != null) {
    const unknown = await validatePermissionCodes(parsed.data.permissionCodes);
    if (unknown.length > 0) { res.status(400).json({ error: `Códigos de permiso desconocidos: ${unknown.join(', ')}` }); return; }
  }
  try {
    const role = await withTransaction((tx) => roleRepo.updateRole(tx, roleId, parsed.data));
    res.json(role);
  } catch (err) {
    if (err instanceof ProtectedRoleError) { res.status(403).json({ error: err.message }); return; }
    sendError(res, 500, 'Error al actualizar el rol', 'PUT /api/admin/roles/:id', err);
  }
});

router.delete('/roles/:id', requirePermission('role.delete'), async (req: Request<{ id: string }>, res: Response) => {
  const roleId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(roleId)) { res.status(400).json({ error: 'id inválido' }); return; }
  try {
    await withTransaction((tx) => roleRepo.deleteRole(tx, roleId));
    res.status(204).end();
  } catch (err) {
    if (err instanceof ProtectedRoleError) { res.status(403).json({ error: err.message }); return; }
    if (err instanceof RoleInUseError) { res.status(409).json({ error: err.message }); return; }
    sendError(res, 500, 'Error al borrar el rol', 'DELETE /api/admin/roles/:id', err);
  }
});

router.get('/permissions', requirePermission('role.view'), async (_req: Request, res: Response) => {
  try {
    const rows = await withTransaction((tx) => roleRepo.listPermissions(tx));
    res.json(rows);
  } catch (err) {
    sendError(res, 500, 'Error al listar permisos', 'GET /api/admin/permissions', err);
  }
});

export default router;
```

## 7. Módulo de ejemplo `{{EXAMPLE_MODULE_NAME}}` — ABM genérico

Demuestra el patrón completo (`ports/domain/infra/api`) aplicado a una entidad simple, sin nada
transversal ni compartido con `auth` — el punto de partida real para el primer dominio de negocio del
proyecto instanciado, y la prueba más directa de que RF-16 se sostiene: este módulo sólo importa de
`platform/` y de sí mismo.

### 7.1. `domain/{{EXAMPLE_MODULE_NAME}}.ts`

```ts
export type {{EXAMPLE_MODULE_NAME_PASCAL}}Status = 'pending' | 'done';

export interface {{EXAMPLE_MODULE_NAME_PASCAL}} {
  id: number;
  title: string;
  description: string;
  status: {{EXAMPLE_MODULE_NAME_PASCAL}}Status;
  createdAt: Date;
}

export interface New{{EXAMPLE_MODULE_NAME_PASCAL}} {
  title: string;
  description: string;
}

export function validateTitle(title: string): string | null {
  if (!title || title.trim().length === 0) return 'title no puede estar vacío';
  if (title.length > 200) return 'title no puede superar 200 caracteres';
  return null;
}
```

### 7.2. `ports/{{EXAMPLE_MODULE_NAME}}.repository.ts`

```ts
import type { Transaction } from '../../../platform/db/transaction.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}, New{{EXAMPLE_MODULE_NAME_PASCAL}} } from '../domain/{{EXAMPLE_MODULE_NAME}}.js';

export interface {{EXAMPLE_MODULE_NAME_PASCAL}}Repository {
  create(tx: Transaction, input: New{{EXAMPLE_MODULE_NAME_PASCAL}}): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}>;
  findById(tx: Transaction, id: number): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null>;
  listAll(tx: Transaction): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}[]>;
  update(tx: Transaction, id: number, input: Partial<New{{EXAMPLE_MODULE_NAME_PASCAL}}> & { status?: string }): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null>;
  deleteById(tx: Transaction, id: number): Promise<boolean>;
}
```

### 7.3. `infra/{{EXAMPLE_MODULE_NAME}}.repository.pg.ts`

```ts
import type { Transaction } from '../../../platform/db/transaction.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}, New{{EXAMPLE_MODULE_NAME_PASCAL}} } from '../domain/{{EXAMPLE_MODULE_NAME}}.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}Repository } from '../ports/{{EXAMPLE_MODULE_NAME}}.repository.js';

function num(v: unknown): number {
  return typeof v === 'string' ? Number(v) : (v as number);
}

interface Row {
  id: number | string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

function toDomain(row: Row): {{EXAMPLE_MODULE_NAME_PASCAL}} {
  return {
    id: num(row.id),
    title: row.title,
    description: row.description,
    status: row.status as {{EXAMPLE_MODULE_NAME_PASCAL}}['status'],
    createdAt: new Date(row.created_at),
  };
}

const COLUMNS = 'id, title, description, status, created_at';

export class Pg{{EXAMPLE_MODULE_NAME_PASCAL}}Repository implements {{EXAMPLE_MODULE_NAME_PASCAL}}Repository {
  async create(tx: Transaction, input: New{{EXAMPLE_MODULE_NAME_PASCAL}}): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}> {
    const { rows } = await tx.query(
      `INSERT INTO {{EXAMPLE_ENTITY_TABLE}} (title, description) VALUES ($1, $2) RETURNING ${COLUMNS}`,
      [input.title, input.description],
    );
    return toDomain(rows[0] as Row);
  }

  async findById(tx: Transaction, id: number): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null> {
    const { rows } = await tx.query(`SELECT ${COLUMNS} FROM {{EXAMPLE_ENTITY_TABLE}} WHERE id = $1`, [id]);
    return rows[0] ? toDomain(rows[0] as Row) : null;
  }

  async listAll(tx: Transaction): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}[]> {
    const { rows } = await tx.query(`SELECT ${COLUMNS} FROM {{EXAMPLE_ENTITY_TABLE}} ORDER BY created_at DESC`, []);
    return (rows as Row[]).map(toDomain);
  }

  async update(tx: Transaction, id: number, input: Partial<New{{EXAMPLE_MODULE_NAME_PASCAL}}> & { status?: string }): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null> {
    const { rows } = await tx.query(
      `UPDATE {{EXAMPLE_ENTITY_TABLE}}
          SET title = COALESCE($2, title), description = COALESCE($3, description), status = COALESCE($4, status)
        WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, input.title ?? null, input.description ?? null, input.status ?? null],
    );
    return rows[0] ? toDomain(rows[0] as Row) : null;
  }

  async deleteById(tx: Transaction, id: number): Promise<boolean> {
    const { rowCount } = await tx.query(`DELETE FROM {{EXAMPLE_ENTITY_TABLE}} WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }
}
```

### 7.4. `infra/{{EXAMPLE_MODULE_NAME}}.repository.in-memory.ts`

```ts
import type { Transaction } from '../../../platform/db/transaction.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}, New{{EXAMPLE_MODULE_NAME_PASCAL}} } from '../domain/{{EXAMPLE_MODULE_NAME}}.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}Repository } from '../ports/{{EXAMPLE_MODULE_NAME}}.repository.js';

export class InMemory{{EXAMPLE_MODULE_NAME_PASCAL}}Repository implements {{EXAMPLE_MODULE_NAME_PASCAL}}Repository {
  private items = new Map<number, {{EXAMPLE_MODULE_NAME_PASCAL}}>();
  private nextId = 1;

  async create(_tx: Transaction, input: New{{EXAMPLE_MODULE_NAME_PASCAL}}): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}> {
    const item: {{EXAMPLE_MODULE_NAME_PASCAL}} = { id: this.nextId++, title: input.title, description: input.description, status: 'pending', createdAt: new Date() };
    this.items.set(item.id, item);
    return item;
  }

  async findById(_tx: Transaction, id: number): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null> {
    return this.items.get(id) ?? null;
  }

  async listAll(_tx: Transaction): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}[]> {
    return [...this.items.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(_tx: Transaction, id: number, input: Partial<New{{EXAMPLE_MODULE_NAME_PASCAL}}> & { status?: string }): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null> {
    const item = this.items.get(id);
    if (!item) return null;
    if (input.title != null) item.title = input.title;
    if (input.description != null) item.description = input.description;
    if (input.status != null) item.status = input.status as {{EXAMPLE_MODULE_NAME_PASCAL}}['status'];
    return item;
  }

  async deleteById(_tx: Transaction, id: number): Promise<boolean> {
    return this.items.delete(id);
  }
}
```

### 7.5. `api/{{EXAMPLE_MODULE_NAME}}.routes.ts`

```ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { withTransaction } from '../../../platform/db/unit-of-work.js';
import { requirePermission } from '../../../platform/http/require-permission.js';
import { validateTitle } from '../domain/{{EXAMPLE_MODULE_NAME}}.js';
import { Pg{{EXAMPLE_MODULE_NAME_PASCAL}}Repository } from '../infra/{{EXAMPLE_MODULE_NAME}}.repository.pg.js';

const router = Router();
const repo = new Pg{{EXAMPLE_MODULE_NAME_PASCAL}}Repository();

const createSchema = z.object({ title: z.string(), description: z.string().default('') });
const updateSchema = z.object({ title: z.string().optional(), description: z.string().optional(), status: z.enum(['pending', 'done']).optional() });

router.get('/', requirePermission('{{EXAMPLE_MODULE_NAME}}.view'), async (_req: Request, res: Response) => {
  const items = await withTransaction((tx) => repo.listAll(tx));
  res.json(items);
});

router.get('/:id', requirePermission('{{EXAMPLE_MODULE_NAME}}.view'), async (req: Request<{ id: string }>, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  const item = await withTransaction((tx) => repo.findById(tx, id));
  if (!item) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.json(item);
});

router.post('/', requirePermission('{{EXAMPLE_MODULE_NAME}}.create'), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  const titleError = validateTitle(parsed.data.title);
  if (titleError) { res.status(400).json({ error: titleError }); return; }
  const item = await withTransaction((tx) => repo.create(tx, parsed.data));
  res.status(201).json(item);
});

router.put('/:id', requirePermission('{{EXAMPLE_MODULE_NAME}}.edit'), async (req: Request<{ id: string }>, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  const item = await withTransaction((tx) => repo.update(tx, id, parsed.data));
  if (!item) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.json(item);
});

router.delete('/:id', requirePermission('{{EXAMPLE_MODULE_NAME}}.delete'), async (req: Request<{ id: string }>, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  const deleted = await withTransaction((tx) => repo.deleteById(tx, id));
  if (!deleted) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.status(204).end();
});

export default router;
```

## 8. Migraciones

### 8.1. `server/migrations/0001_auth.sql`

```sql
-- Up Migration
--
-- Modelo de auth y permisos. `role.protected` incluido desde el día uno —
-- es un flag, nunca se decide por nombre de rol (ver domain/errors.ts §6.4
-- y requirements.md §6).

CREATE TABLE app_user (
  id            BIGSERIAL     PRIMARY KEY,
  google_sub    VARCHAR(255)  NOT NULL UNIQUE,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  name          VARCHAR(255)  NOT NULL DEFAULT '',
  picture_url   TEXT,
  active        BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE role (
  id          BIGSERIAL     PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL UNIQUE,
  description TEXT          NOT NULL DEFAULT '',
  active      BOOLEAN       NOT NULL DEFAULT true,
  protected   BOOLEAN       NOT NULL DEFAULT false
);

CREATE TABLE permission (
  code        VARCHAR(100)  PRIMARY KEY,
  description TEXT          NOT NULL DEFAULT ''
);

CREATE TABLE role_permission (
  role_id         BIGINT       NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_code VARCHAR(100) NOT NULL REFERENCES permission(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE user_role (
  user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Catálogo base — sumar filas acá en migraciones de seguimiento a medida
-- que se agreguen módulos/permisos reales del proyecto. Esta tabla es
-- infraestructura compartida por diseño (ver plan.md §6): cualquier módulo
-- puede extenderla vía su propia migración sin violar el principio de
-- bajo acoplamiento entre módulos, que es sobre código de aplicación,
-- no sobre datos.
INSERT INTO permission (code, description) VALUES
  ('user.view', 'Ver usuarios y sus roles'),
  ('user.edit', 'Activar/inactivar usuarios, asignarles roles'),
  ('role.view',   'Ver roles y sus permisos'),
  ('role.create', 'Crear roles'),
  ('role.edit',   'Editar el set de permisos de un rol'),
  ('role.delete', 'Borrar roles'),
  ('diagnostics.view', 'Ver el endpoint de diagnóstico del sistema');

INSERT INTO role (name, description, protected) VALUES ('Admin', 'Acceso total, seed inicial', true);
INSERT INTO role_permission (role_id, permission_code)
  SELECT (SELECT id FROM role WHERE name = 'Admin'), code FROM permission;

-- Down Migration

DROP TABLE IF EXISTS user_role;
DROP TABLE IF EXISTS role_permission;
DROP TABLE IF EXISTS permission;
DROP TABLE IF EXISTS role;
DROP TABLE IF EXISTS app_user;
```

### 8.2. `server/migrations/0002_{{EXAMPLE_MODULE_NAME}}.sql`

```sql
-- Up Migration

CREATE TABLE {{EXAMPLE_ENTITY_TABLE}} (
  id          BIGSERIAL     PRIMARY KEY,
  title       VARCHAR(200)  NOT NULL,
  description TEXT          NOT NULL DEFAULT '',
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

INSERT INTO permission (code, description) VALUES
  ('{{EXAMPLE_MODULE_NAME}}.view',   'Ver {{EXAMPLE_MODULE_NAME_PASCAL}}'),
  ('{{EXAMPLE_MODULE_NAME}}.create', 'Crear {{EXAMPLE_MODULE_NAME_PASCAL}}'),
  ('{{EXAMPLE_MODULE_NAME}}.edit',   'Editar {{EXAMPLE_MODULE_NAME_PASCAL}}'),
  ('{{EXAMPLE_MODULE_NAME}}.delete', 'Borrar {{EXAMPLE_MODULE_NAME_PASCAL}}');

INSERT INTO role_permission (role_id, permission_code)
  SELECT (SELECT id FROM role WHERE name = 'Admin'), code
    FROM permission WHERE code LIKE '{{EXAMPLE_MODULE_NAME}}.%';

-- Down Migration

DELETE FROM role_permission WHERE permission_code LIKE '{{EXAMPLE_MODULE_NAME}}.%';
DELETE FROM permission WHERE code LIKE '{{EXAMPLE_MODULE_NAME}}.%';
DROP TABLE IF EXISTS {{EXAMPLE_ENTITY_TABLE}};
```

## 9. `server/index.ts` — wiring

Es la única raíz de composición del sistema: el único archivo que conoce todos los módulos a la vez y los
monta juntos. Esto no viola RF-16 — la regla prohíbe que un módulo importe de otro módulo, no que exista
un punto central que los una a todos para arrancar el proceso.

```ts
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pool } from './platform/db/pool.js';
import { authenticate } from './platform/http/authenticate.js';
import { requirePermission } from './platform/http/require-permission.js';
import authRouter from './modules/auth/api/auth.routes.js';
import adminRouter from './modules/auth/api/admin.routes.js';
import {{EXAMPLE_MODULE_NAME}}Router from './modules/{{EXAMPLE_MODULE_NAME}}/api/{{EXAMPLE_MODULE_NAME}}.routes.js';
import { env } from './platform/config/env.js';

const app = express();

app.use(cookieParser());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

app.use('/api/auth', authRouter); // sin authenticate: acá se emite la sesión.

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api', authenticate); // todo lo que sigue exige sesión válida.
app.use('/api/admin', adminRouter);
app.use('/api/{{EXAMPLE_MODULE_PATH}}', {{EXAMPLE_MODULE_NAME}}Router);

app.get('/api/diagnostics', requirePermission('diagnostics.view'), async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now, version() AS version');
    res.json({ status: 'ok', database: rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
});

// Exportado para que api/index.ts pueda reusar este mismo `app` en el
// bundling serverless de Vercel, sin arrastrar el .listen() — Vercel es
// quien maneja el ciclo de vida del proceso ahí, no este archivo.
export { app };

// .listen() sólo corre cuando este archivo es el entrypoint real del
// proceso (`npm run server`) — no cuando otro módulo lo importa sólo para
// tomar `app` (el caso de api/index.ts). Sin este guard, importar `app`
// desde otro lado dispara un segundo listener compitiendo por el puerto.
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  app.listen(env.PORT, () => console.log(`🚀 API server running on http://localhost:${env.PORT}`));
}
```

### 9.1. `api/index.ts`

```ts
export { app } from '../server/index.js';
```

Reexporta el mismo `app` para el bundling serverless de Vercel — como `server/index.ts` sólo llama
`.listen()` cuando es el entrypoint directo (§9), este import no dispara un segundo servidor escuchando el
puerto.

## 10. Frontend

### 10.1. Componentes UI

`components.json` configura shadcn/ui (estilo `new-york`, Tailwind v4, alias `@/components`). Los
primitivos (`Button`, `Card`, `Table`, `Dialog`, `Input`, `Label`, `Checkbox`, `Switch`, `Badge`) se
instalan con `npx shadcn@latest add <componente>` — boilerplate genérico de la librería, no parte del
patrón arquitectónico que este scaffold documenta, por eso no se copia a mano acá. `Switch` y `Badge` son
parte del set base porque el ABM de usuarios/roles los usa de punta a punta (estado activo/inactivo, roles
asignados) — no son un agregado opcional.

**`npx shadcn@latest init`/`add` son interactivos** — en una terminal real preguntan estilo, color base,
alias de imports, etc., y esperan respuesta por teclado. Un agente ejecutando esto sin una persona del
otro lado no puede completar el wizard: el comando se queda esperando un input que nunca llega, o falla al
no detectar una terminal interactiva. Dos caminos, según quién ejecute:

- **Una persona, a mano**: corre `npx shadcn@latest init` y responde el wizard, después
  `npx shadcn@latest add button card table dialog input label checkbox switch badge` — funciona tal cual.
- **Un agente autónomo, sin humano contestando prompts**: escribe `components.json` (§10.1a) y los
  primitivos a mano, siguiendo el código fuente público de shadcn/ui para cada componente (`Button`,
  `Card`, `Table`, `Dialog`, `Input`, `Label`, `Checkbox`, `Switch`, `Badge`) — funcionalmente idéntico al
  resultado del wizard, sin pasar por él. Las 5 dependencias `@radix-ui/*` que esto requiere ya están
  fijas en §2.1.

### 10.1a. `components.json`

`baseColor` no es un detalle cosmético sin consecuencia — es la semilla de la que sale toda la paleta
generada (`background`, `foreground`, `card`, `primary`, `border`, etc.), no sólo los grises. Se fija
`neutral` para que dos instanciaciones den el mismo resultado, sin dejarlo a criterio de quien ejecute:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### 10.1b. `src/lib/utils.ts`

Cada primitivo de `ui/` lo importa (`import { cn } from '@/lib/utils'`) — sin este archivo ninguno
compila.

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 10.1c. `src/components/ui/switch.tsx`

El estado activo/inactivo de un registro (§10.6) usa este control, consistente con el resto del sistema
de diseño — no un botón de texto "Activar"/"Desactivar".

```tsx
import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-background pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
```

### 10.1d. `src/components/ui/badge.tsx`

Los roles asignados a un usuario y el estado de un registro (§10.6/§10.8) se muestran como pills, no como
texto plano separado por comas — más legible cuando hay varios valores en la misma celda.

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
```

### 10.1e. `src/components/ui/sidebar.tsx`

La navegación de la app usa el componente `Sidebar` real de shadcn/ui, no un `<aside>` armado a mano — con
colapso funcional (estado persistido en cookie, atajo `Cmd/Ctrl+B`), no un ícono decorativo. Versión
acotada a lo que este scaffold necesita: variante de escritorio con colapso a rail de íconos. La variante
mobile (`Sheet` deslizable) y los tooltips sobre los ítems colapsados quedan fuera de esta v1 — se suman
el día que el proyecto instanciado los necesite, sobre esta misma base.

```tsx
import * as React from 'react';
import { PanelLeftIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_ICON = '3rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

type SidebarContextProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar() usado fuera de <SidebarProvider>');
  return context;
}

function SidebarProvider({
  defaultOpen = true,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & { defaultOpen?: boolean }) {
  const [open, setOpenState] = React.useState(() => {
    if (typeof document === 'undefined') return defaultOpen;
    const match = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`));
    return match ? match[1] === 'true' : defaultOpen;
  });

  const setOpen = React.useCallback((value: boolean) => {
    setOpenState(value);
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  }, []);

  const toggleSidebar = React.useCallback(() => setOpen(!open), [open, setOpen]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleSidebar }}>
      <div
        data-slot="sidebar-wrapper"
        style={{ '--sidebar-width': SIDEBAR_WIDTH, '--sidebar-width-icon': SIDEBAR_WIDTH_ICON, ...style } as React.CSSProperties}
        className={cn('flex min-h-svh w-full', className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { open } = useSidebar();

  return (
    <div
      data-slot="sidebar"
      data-state={open ? 'expanded' : 'collapsed'}
      className="text-sidebar-foreground relative h-svh shrink-0 transition-[width] duration-200 ease-linear"
      style={{ width: open ? 'var(--sidebar-width)' : 'var(--sidebar-width-icon)' }}
    >
      <div
        data-slot="sidebar-container"
        className={cn(
          'bg-sidebar border-sidebar-border flex h-full flex-col overflow-hidden border-r',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-slot="sidebar-trigger"
      type="button"
      className={cn('hover:bg-sidebar-accent inline-flex size-7 items-center justify-center rounded-md', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-inset" className={cn('flex min-h-svh flex-1 flex-col', className)} {...props} />;
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('flex flex-col gap-2 p-3', className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('flex flex-col gap-2 p-3', className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto', className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('flex w-full flex-col gap-1 px-2', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('relative', className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  'flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      isActive: {
        true: 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
        false: '',
      },
    },
    defaultVariants: { isActive: false },
  },
);

function SidebarMenuButton({
  className,
  isActive,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof sidebarMenuButtonVariants> & { isActive?: boolean }) {
  const { open } = useSidebar();
  return (
    <button
      data-slot="sidebar-menu-button"
      data-active={isActive}
      title={!open ? String(props.children) : undefined}
      className={cn(sidebarMenuButtonVariants({ isActive }), !open && 'justify-center', className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
};
```

### 10.1f. `src/components/ui/dropdown-menu.tsx`

Usado por el menú de usuario del header (§10.4) — `Cerrar sesión`, con lugar para sumar más opciones sin
rediseñar el trigger.

```tsx
import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg',
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
```

### 10.2. `src/lib/api.ts`

```ts
const BASE = '/api';

export class ApiRequestError extends Error {
  constructor(message: string, public status?: number, public responseBody?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiRequestError(body?.error ?? res.statusText, res.status, body);
  return body as T;
}

export const api = {
  auth: {
    google: (idToken: string) => request<{ user: { id: number; email: string; name: string }; permissions: string[] }>('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
    me: () => request<{ user: { id: number; email: string }; permissions: string[] }>('/auth/me'),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
  },
  admin: {
    listUsers: () => request<unknown[]>('/admin/users'),
    patchUser: (id: number, body: { active?: boolean; roleIds?: number[] }) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    listRoles: () => request<unknown[]>('/admin/roles'),
    createRole: (body: { name: string; description: string; permissionCodes: string[] }) => request('/admin/roles', { method: 'POST', body: JSON.stringify(body) }),
    updateRole: (id: number, body: { name?: string; description?: string; permissionCodes?: string[] }) => request(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteRole: (id: number) => request<void>(`/admin/roles/${id}`, { method: 'DELETE' }),
    listPermissions: () => request<{ code: string; description: string }[]>('/admin/permissions'),
  },
  {{EXAMPLE_MODULE_NAME}}: {
    list: () => request<unknown[]>('/{{EXAMPLE_MODULE_PATH}}'),
    create: (body: { title: string; description: string }) => request('/{{EXAMPLE_MODULE_PATH}}', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request(`/{{EXAMPLE_MODULE_PATH}}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: number) => request(`/{{EXAMPLE_MODULE_PATH}}/${id}`, { method: 'DELETE' }),
  },
  diagnostics: {
    check: () => request<{ status: 'ok' | 'error'; database?: { now: string; version: string }; message?: string }>('/diagnostics'),
  },
};
```

### 10.3. `src/lib/auth-context.tsx`

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

export type AuthStatus = 'checking' | 'anonymous' | 'authenticated';

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  pictureUrl?: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  permissions: string[];
  status: AuthStatus;
  hasPermission: (code: string) => boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() usado fuera de <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const session = await api.auth.me();
      setUser(session.user);
      setPermissions(session.permissions);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setPermissions([]);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    setPermissions([]);
    setStatus('anonymous');
  }, []);

  const hasPermission = useCallback((code: string) => permissions.includes(code), [permissions]);

  return (
    <AuthContext.Provider value={{ user, permissions, status, hasPermission, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 10.4. `src/App.tsx` — shell de la aplicación

`AuthGate` tipa `children` como opcional (`children?: React.ReactNode`) — es un wrapper genérico, no
acoplado a que siempre haya contenido real adentro; TypeScript exige esto explícito bajo `tsc --noEmit`
estricto (`npm run build` usa `--noCheck` y no lo hace cumplir, pero el chequeo real sí).

`AuthGate` es también el único lugar que sabe qué hacer con el resultado del login: `LoginButton` (§10.5)
es un componente sin estado de red propio — recibe `onSuccess`/`onError` y delega. `AuthGate` llama a
`api.auth.google(idToken)`, y si el servidor la rechaza (dominio no permitido, token inválido), el mensaje
real (`ApiRequestError.message`, ver §10.2) queda en `loginError` y se muestra debajo del botón — nunca un
`console.error` que sólo se ve en devtools. Mismo criterio de "todo error de una acción que dispara el
usuario llega a la pantalla" que el resto del sistema de diseño (§5.1 de `requirements.md`, §11.1).

Una vez autenticado, `Shell` monta la navegación real de la app sobre el componente `Sidebar` real de
shadcn/ui (§10.1e) — colapso funcional, no un ícono decorativo — gateada por `hasPermission()` (§5.1 de
`requirements.md`, §11.1 más abajo) para que sólo aparezcan las secciones que el usuario puede usar, con
un header que muestra la sección activa y la sesión actual.

```tsx
import { useState } from 'react';
import { Home, Users, ShieldCheck, Package, LogOut, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { api, ApiRequestError } from './lib/api';
import { LoginButton } from './components/LoginButton';
import { UsersView } from './components/UsersView';
import { RolesView } from './components/RolesView';
import { {{EXAMPLE_MODULE_NAME_PASCAL}}View } from './components/{{EXAMPLE_MODULE_NAME_PASCAL}}View';
import { DiagnosticsView } from './components/DiagnosticsView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from './components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';

type Section = 'home' | 'users' | 'roles' | '{{EXAMPLE_MODULE_NAME}}' | 'diagnostics';

function AuthGate({ children }: { children?: React.ReactNode }) {
  const { status, refresh } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleSuccess = async (idToken: string) => {
    try {
      await api.auth.google(idToken);
      setLoginError(null);
      await refresh();
    } catch (err) {
      setLoginError(err instanceof ApiRequestError ? err.message : 'No se pudo iniciar sesión');
    }
  };

  if (status === 'checking') return <div className="p-8">Cargando…</div>;

  if (status === 'anonymous') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">{{PROJECT_NAME_TITLE}}</CardTitle>
            <CardDescription>Iniciá sesión con tu cuenta de Google para continuar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <LoginButton onSuccess={handleGoogleSuccess} onError={setLoginError} />
            {loginError && <p className="text-sm text-destructive text-center">{loginError}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

const NAV: { key: Section; label: string; icon: typeof Home; permission?: string }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'users', label: 'Usuarios', icon: Users, permission: 'user.view' },
  { key: 'roles', label: 'Roles', icon: ShieldCheck, permission: 'role.view' },
  { key: '{{EXAMPLE_MODULE_NAME}}', label: '{{EXAMPLE_MODULE_NAME_PASCAL}}', icon: Package, permission: '{{EXAMPLE_MODULE_NAME}}.view' },
  { key: 'diagnostics', label: 'Diagnóstico', icon: Activity, permission: 'diagnostics.view' },
];

function AppSidebar({ current, onSelect }: { current: Section; onSelect: (s: Section) => void }) {
  const { hasPermission } = useAuth();
  const { open } = useSidebar();
  const visible = NAV.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <Sidebar>
      <SidebarHeader>
        {open && <span className="px-1 text-sm font-semibold">{{PROJECT_NAME_TITLE}}</span>}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {visible.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton isActive={item.key === current} onClick={() => onSelect(item.key)}>
                <item.icon className="size-4 shrink-0" />
                {open && item.label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

function Shell() {
  const { user, hasPermission, logout } = useAuth();
  const [section, setSection] = useState<Section>('home');

  const visible = NAV.filter((item) => !item.permission || hasPermission(item.permission));
  const current = visible.find((item) => item.key === section) ?? visible[0];
  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <SidebarProvider>
      <AppSidebar current={current?.key ?? 'home'} onSelect={setSection} />
      <SidebarInset>
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">{current?.label}</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1 text-sm">
              <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-medium">
                {initial}
              </span>
              <span>{user?.email}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-muted-foreground font-normal">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="p-6">
          {current?.key === 'home' && (
            <p className="text-sm text-muted-foreground">Bienvenido a {{PROJECT_NAME_TITLE}}.</p>
          )}
          {current?.key === 'users' && <UsersView />}
          {current?.key === 'roles' && <RolesView />}
          {current?.key === '{{EXAMPLE_MODULE_NAME}}' && <{{EXAMPLE_MODULE_NAME_PASCAL}}View />}
          {current?.key === 'diagnostics' && <DiagnosticsView />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <Shell />
      </AuthGate>
    </AuthProvider>
  );
}
```

### 10.5. `src/components/LoginButton.tsx`

Google Identity Services, cargado en runtime — sin agregar el script a `index.html` a mano. El componente
no sabe nada de la API ni de la sesión: recibe `onSuccess(idToken)`/`onError(message)` y delega — quien lo
monta (`AuthGate`, §10.4) decide qué hacer con el resultado, incluido dónde mostrar un error. Esto es a
propósito, no un mínimo: mantiene la carga del script de Google (con su propia lógica de reintento/script
ya presente en el DOM) separada de la lógica de sesión de la app, cada una testeable y reemplazable sin
tocar la otra.

```tsx
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(parent: HTMLElement, options: { theme?: string; size?: string }): void;
        };
      };
    };
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface LoginButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: (message: string) => void;
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener('load', () => resolve()));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el script de Google'));
    document.head.appendChild(script);
  });
}

export function LoginButton({ onSuccess, onError }: LoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) {
      onError?.('VITE_GOOGLE_CLIENT_ID no está configurado');
      return;
    }
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onSuccess(response.credential),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
        });
      })
      .catch((err) => onError?.((err as Error).message));
    return () => {
      cancelled = true;
    };
  }, [onSuccess, onError]);

  return <div ref={buttonRef} />;
}
```

`VITE_GOOGLE_CLIENT_ID` (con prefijo `VITE_`, distinto de `GOOGLE_CLIENT_ID` server-only) va en `.env.example` — ver §12.4. Termina en el bundle del navegador por diseño de Vite; no es sensible (lo protege la verificación de `audience` del lado del server, no el Client ID en sí).

### 10.6. `src/components/UsersView.tsx`

ABM de usuarios: listar con sus roles, activar/desactivar, reasignar roles — gateado por `user.edit`.
Sigue el sistema de diseño de `requirements.md` §5.1: tabla envuelta en `Card`, estado con `Switch`,
roles como `Badge`, y el diálogo de roles persiste sólo al confirmar `Guardar`.

```tsx
import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  active: boolean;
  roles: { id: number; name: string }[];
}

interface AdminRole {
  id: number;
  name: string;
}

export function UsersView() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const load = async () => {
    const [u, r] = await Promise.all([
      api.admin.listUsers() as Promise<AdminUser[]>,
      api.admin.listRoles() as Promise<AdminRole[]>,
    ]);
    setUsers(u);
    setRoles(r);
  };

  useEffect(() => { load(); }, []);

  const canEdit = hasPermission('user.edit');

  const toggleActive = async (user: AdminUser) => {
    await api.admin.patchUser(user.id, { active: !user.active });
    await load();
  };

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setSelectedRoleIds(user.roles.map((r) => r.id));
  };

  const toggleSelectedRole = (roleId: number) => {
    setSelectedRoleIds((ids) => (ids.includes(roleId) ? ids.filter((id) => id !== roleId) : [...ids, roleId]));
  };

  const saveRoles = async () => {
    if (!editing) return;
    await api.admin.patchUser(editing.id, { roleIds: selectedRoleIds });
    setEditing(null);
    await load();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length > 0
                        ? u.roles.map((r) => <Badge key={r.id} variant="secondary">{r.name}</Badge>)
                        : '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={u.active} disabled={!canEdit} onCheckedChange={() => toggleActive(u)} />
                      <span className="text-muted-foreground text-sm">{u.active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                        <Pencil /> Editar roles
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roles de {editing?.email}</DialogTitle>
            <DialogDescription>Reemplaza el set completo de roles asignados.</DialogDescription>
          </DialogHeader>
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 py-1 text-sm">
              <Checkbox
                checked={selectedRoleIds.includes(role.id)}
                onCheckedChange={() => toggleSelectedRole(role.id)}
              />
              {role.name}
            </label>
          ))}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveRoles}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 10.7. `src/components/RolesView.tsx`

ABM de roles: listar/crear/editar/borrar, checklist de permisos. El rol `protected` se muestra con un
`Badge` en vez de acciones de edición/borrado (el backend igual las rechaza con `403`, esto es sólo evitar
el viaje inútil). Mismo sistema de diseño que `UsersView`: tabla en `Card`, botones con ícono, diálogo con
`Cancelar`/`Guardar`.

```tsx
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface AdminRole {
  id: number;
  name: string;
  description: string;
  protected: boolean;
  userCount: number;
  permissions: string[];
}

interface Permission {
  code: string;
  description: string;
}

export function RolesView() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editing, setEditing] = useState<AdminRole | 'new' | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; permissionCodes: string[] }>({
    name: '', description: '', permissionCodes: [],
  });

  const load = async () => {
    const [r, p] = await Promise.all([
      api.admin.listRoles() as Promise<AdminRole[]>,
      api.admin.listPermissions(),
    ]);
    setRoles(r);
    setPermissions(p);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (role: AdminRole | 'new') => {
    setEditing(role);
    setForm(role === 'new'
      ? { name: '', description: '', permissionCodes: [] }
      : { name: role.name, description: role.description, permissionCodes: role.permissions });
  };

  const togglePermission = (code: string) => {
    setForm((f) => ({
      ...f,
      permissionCodes: f.permissionCodes.includes(code)
        ? f.permissionCodes.filter((c) => c !== code)
        : [...f.permissionCodes, code],
    }));
  };

  const save = async () => {
    if (editing === 'new') await api.admin.createRole(form);
    else if (editing) await api.admin.updateRole(editing.id, form);
    setEditing(null);
    await load();
  };

  const remove = async (role: AdminRole) => {
    await api.admin.deleteRole(role.id);
    await load();
  };

  const canManage = hasPermission('role.create') || hasPermission('role.edit');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          {hasPermission('role.create') && (
            <CardAction>
              <Button onClick={() => openEdit('new')}>
                <Plus /> Crear rol
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">{role.description || '—'}</TableCell>
                  <TableCell>{role.permissions.length}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell className="text-right">
                    {role.protected ? (
                      <Badge variant="outline">
                        <ShieldCheck /> protegido
                      </Badge>
                    ) : (
                      canManage && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(role)}>
                            <Pencil /> Editar
                          </Button>
                          {hasPermission('role.delete') && (
                            <Button size="sm" variant="destructive" onClick={() => remove(role)}>
                              <Trash2 /> Borrar
                            </Button>
                          )}
                        </div>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === 'new' ? 'Nuevo rol' : `Editar ${form.name}`}</DialogTitle></DialogHeader>
          <Label>Nombre</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Label>Descripción</Label>
          <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Label>Permisos</Label>
          <div className="max-h-64 overflow-y-auto">
            {permissions.map((p) => (
              <label key={p.code} className="flex items-center gap-2 py-1 text-sm">
                <Checkbox
                  checked={form.permissionCodes.includes(p.code)}
                  onCheckedChange={() => togglePermission(p.code)}
                />
                {p.code}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 10.8. `src/components/{{EXAMPLE_MODULE_NAME_PASCAL}}View.tsx`

ABM del módulo de ejemplo — mismo patrón que las dos vistas anteriores, para que quede claro que no hay
nada especial de auth en la forma de un ABM cualquiera, ni en su sistema de diseño.

```tsx
import { useEffect, useState } from 'react';
import { Plus, Trash2, CircleCheck, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface {{EXAMPLE_MODULE_NAME_PASCAL}}Item {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'done';
}

export function {{EXAMPLE_MODULE_NAME_PASCAL}}View() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<{{EXAMPLE_MODULE_NAME_PASCAL}}Item[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const load = async () => setItems(await api.{{EXAMPLE_MODULE_NAME}}.list() as {{EXAMPLE_MODULE_NAME_PASCAL}}Item[]);

  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.{{EXAMPLE_MODULE_NAME}}.create(form);
    setForm({ title: '', description: '' });
    setOpen(false);
    await load();
  };

  const toggleStatus = async (item: {{EXAMPLE_MODULE_NAME_PASCAL}}Item) => {
    await api.{{EXAMPLE_MODULE_NAME}}.update(item.id, { status: item.status === 'pending' ? 'done' : 'pending' });
    await load();
  };

  const remove = async (item: {{EXAMPLE_MODULE_NAME_PASCAL}}Item) => {
    await api.{{EXAMPLE_MODULE_NAME}}.remove(item.id);
    await load();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{{EXAMPLE_MODULE_NAME_PASCAL}}</CardTitle>
          {hasPermission('{{EXAMPLE_MODULE_NAME}}.create') && (
            <CardAction>
              <Button onClick={() => setOpen(true)}>
                <Plus /> Nuevo
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'done' ? 'default' : 'secondary'}>
                      {item.status === 'done' ? <CircleCheck /> : <Circle />}
                      {item.status === 'done' ? 'Hecho' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {hasPermission('{{EXAMPLE_MODULE_NAME}}.edit') && (
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(item)}>
                          Marcar {item.status === 'pending' ? 'hecho' : 'pendiente'}
                        </Button>
                      )}
                      {hasPermission('{{EXAMPLE_MODULE_NAME}}.delete') && (
                        <Button size="sm" variant="destructive" onClick={() => remove(item)}>
                          <Trash2 /> Borrar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo {{EXAMPLE_MODULE_NAME_PASCAL}}</DialogTitle></DialogHeader>
          <Input placeholder="Título" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 10.8a. `src/components/DiagnosticsView.tsx`

Superficie de frontend para `GET /api/diagnostics` (§9) — el permiso `diagnostics.view` que trae el
catálogo base (§8.1) necesita una pantalla propia, igual que cualquier otro permiso del sistema.

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface DiagnosticsResult {
  status: 'ok' | 'error';
  database?: { now: string; version: string };
  message?: string;
}

export function DiagnosticsView() {
  const [result, setResult] = useState<DiagnosticsResult | null>(null);

  useEffect(() => {
    api.diagnostics
      .check()
      .then(setResult)
      .catch((err) => setResult({ status: 'error', message: err.message }));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!result && <p className="text-muted-foreground">Verificando…</p>}
        {result && (
          <div className="flex items-center gap-2">
            <Badge variant={result.status === 'ok' ? 'default' : 'destructive'}>
              {result.status === 'ok' ? 'Conectado' : 'Error'}
            </Badge>
            {result.database && (
              <span className="text-muted-foreground">{result.database.version}</span>
            )}
            {result.message && <span className="text-muted-foreground">{result.message}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 10.9. `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

### 10.10. `src/index.css`

`components.json` (§10.1a) fija `baseColor: "neutral"` porque es el punto de partida que espera la CLI de
shadcn/ui — pero la paleta que efectivamente se usa en tiempo de ejecución es la de este archivo, que
declara sus propios tokens de marca (azul primario, acento cálido, tipografías propias) en vez de quedarse
con la escala de grises que `baseColor` generaría por default. Tailwind v4 CSS-first, sin archivo de
config aparte.

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.2 0.02 250);

  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2 0.02 250);

  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.2 0.02 250);

  --primary: oklch(0.45 0.15 250);
  --primary-foreground: oklch(1 0 0);

  --secondary: oklch(0.92 0.02 250);
  --secondary-foreground: oklch(0.2 0.02 250);

  --muted: oklch(0.96 0.01 250);
  --muted-foreground: oklch(0.5 0.02 250);

  --accent: oklch(0.65 0.2 50);
  --accent-foreground: oklch(0.2 0 0);

  --destructive: oklch(0.55 0.22 25);
  --destructive-foreground: oklch(1 0 0);

  --success: oklch(0.55 0.18 160);
  --success-foreground: oklch(1 0 0);

  --border: oklch(0.9 0.01 250);
  --input: oklch(0.9 0.01 250);
  --ring: oklch(0.65 0.2 50);

  --radius: 0.5rem;

  /* Tokens del componente Sidebar (§10.1e) — el sidebar es una superficie
     visualmente distinta del resto de la app (fondo levemente teñido en
     vez de blanco puro), no una reutilización de --card/--background. */
  --sidebar: oklch(0.98 0.005 250);
  --sidebar-foreground: oklch(0.2 0.02 250);
  --sidebar-primary: oklch(0.45 0.15 250);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.94 0.01 250);
  --sidebar-accent-foreground: oklch(0.2 0.02 250);
  --sidebar-border: oklch(0.9 0.01 250);
  --sidebar-ring: oklch(0.65 0.2 50);
}

@theme inline {
  --radius-sm: calc(var(--radius) * 0.5);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) * 1.5);
  --radius-xl: calc(var(--radius) * 2);
  --radius-2xl: calc(var(--radius) * 3);
  --radius-full: 9999px;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-heading: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
    font-family: var(--font-body);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
  }

  code, pre, .font-mono {
    font-family: var(--font-mono);
  }
}
```

Sin modo oscuro en esta v1 — no hay ningún control en la UI que agregue la clase `.dark` al árbol, así que
un bloque `.dark` quedaría sin uso real. Se agrega el día que haga falta, junto con el toggle que lo
dispare.

### 10.11. `src/vite-env.d.ts`

Sin este archivo, `import.meta.env.VITE_GOOGLE_CLIENT_ID` (§10.5) y el import de `./index.css` (§10.9) no
tipan bajo `tsc --noEmit` estricto — el `build` normal (`tsc -b --noCheck`) lo tapa, así que el gap sólo
aparece si alguien corre el chequeo de tipos real.

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## 11. Memoria inicial del proyecto (multi-agente)

**Por qué existe esta sección**: el proyecto instanciado lo van a abrir y modificar personas distintas
desde herramientas distintas — Claude Code, GitHub Copilot coding agent (web), y potencialmente otras.
Cada una descubre archivos de instrucciones por su cuenta y de forma distinta; sin un único lugar de
verdad, los acuerdos del proyecto (arquitectura, branching, TDD, hosting) divergen silenciosamente según
qué agente los haya "aprendido" de qué archivo. Ver `spec.md` RF-14/RF-15.

Verificado contra la documentación oficial de GitHub (2026-08-27): **GitHub Copilot coding agent lee, en
este orden de combinación, `AGENTS.md` (el más cercano en el árbol gana), `.github/copilot-instructions.md`,
`.github/instructions/*.instructions.md`, y también soporta un único `CLAUDE.md` (o `GEMINI.md`) en la raíz
del repo directamente.** Claude Code sólo garantiza leer `CLAUDE.md`. La estructura que seguir:

- **`requirements.md`** — fuente única de los acuerdos fundamentales. Contenido completo, no un resumen.
- **`CLAUDE.md`** — contenido completo (Claude Code lo lee garantizado; Copilot también, directamente).
  Apunta a `requirements.md`, no lo duplica.
- **`AGENTS.md`** — puntero corto a los dos anteriores, para cualquier agente que sólo busque `AGENTS.md`
  y no un `CLAUDE.md` de raíz. Nunca una copia — evita que haya dos fuentes de verdad desincronizándose.

### 11.1. `requirements.md`

```markdown
# requirements.md — Acuerdos fundamentales de {{PROJECT_NAME_TITLE}}

Fuente de verdad para cualquier agente de código (Claude Code, GitHub Copilot coding agent, u otro) que
trabaje en este repo. Todo spec nuevo (`specs/NNN-slug/`) debe ser consistente con lo que está acá — si
algo lo contradice, se discute con el equipo y se actualiza este documento primero, nunca se lo ignora en
silencio ni se lo contradice en un spec sin dejarlo dicho.

## 1. Hosting y deploy

- Vercel, build desde `main`. El script `vercel-build` corre en este orden:
  `typecheck:server && npm run migrate && npm run build` — el esquema se aplica ANTES del build del
  bundle, y todo el build falla cerrado si el typecheck o la migración fallan.
- Las migraciones corren en el build, nunca en el cold start del proceso.
- Env vars server-only (`DATABASE_URL`, `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_ID`) como **Secret**. Cualquier
  var con prefijo `VITE_` termina en el bundle del navegador igual (Vite la inyecta en build time) — va
  como **Config**, nunca Secret.
- Previews (build o no de ramas que no son `main`): [decisión del proyecto — documentar acá cuál se tomó].

## 2. SDD obligatorio para toda feature nueva

- Todo feature/fix no trivial se planifica antes de escribir código: `specs/NNN-slug/{spec.md,plan.md,tasks.md}`.
- Convención tomada de [GitHub spec-kit](https://github.com/github/spec-kit) — no inventada para este
  proyecto. `spec.md` = QUÉ y POR QUÉ (requisitos, historias de usuario, criterios de aceptación, sin
  detalle técnico). `plan.md` = decisiones técnicas — arquitectura, modelo de datos, contratos de API,
  estructura de proyecto — **no código fuente completo**; para una feature con superficie grande, separar
  el detalle en artefactos propios (`data-model.md`, `contracts/`) en vez de inflar `plan.md`. `tasks.md`
  = checklist ejecutable con IDs y dependencias — el código real se escribe ahí, tarea por tarea, no antes.
- **Templates para los 7 artefactos** (`spec.md`/`plan.md`/`tasks.md` obligatorios;
  `research.md`/`data-model.md`/`contracts/`/`quickstart.md` opcionales, según lo que la feature necesite)
  viven en `templates/` en la raíz de este repo — ver `plan.md` §11.4 del scaffold que lo generó para el
  contenido completo, y `README.md` §"Flujo SDD end-to-end" para una explicación sin jerga de qué es cada
  uno.
- **Análisis de consistencia cruzada obligatorio antes de implementar** (equivalente a `/analyze` de
  spec-kit): antes de arrancar la Fase 1 de `tasks.md` (T001 en adelante), corré el prompt de análisis
  documentado en `README.md` contra `spec.md`/`plan.md`/`tasks.md` de la feature y `requirements.md`. Es
  de sólo lectura — nunca modifica archivos, sólo devuelve un reporte de duplicación, ambigüedad,
  subespecificación, violación de este documento, requisitos sin tarea asociada, e inconsistencia
  terminológica. El resultado (aunque sea "sin hallazgos") queda registrado como **T000** en `tasks.md` —
  ver `templates/tasks-template.md`. Ningún spec pasa a implementación sin este paso hecho.
- **Excepción, ya cerrada, que no sienta precedente**: el `plan.md` de `001-scaffold-inicial` (el spec que
  generó este scaffold) sí tiene código fuente completo embebido — porque ese spec no es una feature, es
  un scaffold: el objetivo es que se reproduzca exactamente igual en cada instanciación, sin margen de
  diseño para el agente ejecutor. Ningún spec posterior a `001` repite ese patrón — desde `002` en
  adelante, `plan.md` vuelve al estándar real de spec-kit descripto arriba.
- Nada de código sin spec validado por un humano primero.
- Los specs quedan numerados secuencialmente y nunca se reescriben retroactivamente — una corrección a un
  spec ya cerrado es un spec nuevo que lo referencia, no una edición silenciosa del viejo.
- Idioma: identificadores técnicos (funciones, variables, nombres de test) en inglés; los documentos de
  spec en español — salvo que el equipo decida lo contrario para este proyecto puntual.

## 3. TDD como estándar

- Desde el primer spec de feature real (no `001-scaffold-inicial`, que no tenía nada previo contra qué
  testear), todo requisito funcional se implementa test-first: test que falla → código mínimo que lo pasa
  → refactor. `tasks.md` intercala explícitamente tarea de test y tarea de implementación, no las agrupa al
  final.

## 4. Bajo acoplamiento y dirección de dependencias entre módulos — no negociable

Dos principios de diseño de paquetes con nombre propio, no una regla inventada para este proyecto: **bajo
acoplamiento** y **dirección de dependencias hacia la capa estable** (*Stable Dependencies Principle*).

- **Regla de acoplamiento**: ningún módulo (`server/modules/<x>/{ports,domain,infra,api}`) importa un
  archivo de `ports/domain/infra/api` de otro módulo de dominio.
- **Regla de dirección**: `server/platform/` — la capa más estable del sistema, la que menos cambia —
  nunca importa de ningún módulo de dominio. La dependencia sólo va de un módulo hacia `platform/`, nunca
  al revés. Única excepción: `server/index.ts`, la raíz de composición, que conoce todos los módulos para
  montarlos.
- Más estricto que el *Acyclic Dependencies Principle* clásico: no alcanza con prohibir ciclos, se
  prohíbe directamente cualquier dependencia módulo→módulo — el objetivo es que cada módulo sea extraíble
  solo, no sólo que el grafo no tenga vueltas.
- **Por qué es no negociable**: es la única regla de esta lista cuya violación no la detecta ningún test
  unitario del módulo afectado — todo sigue compilando y pasando tests, y el síntoma real (un módulo que
  debería poder aislarse y en realidad no puede) sólo aparece el día que alguien intenta extraerlo,
  cuando ya es una refactorización cara en vez de un chequeo de 10 líneas.
- **Antes de poner algo en `domain/` o `infra/` de un módulo**, preguntar: "¿esto lo va a necesitar sólo
  este módulo, o cualquier módulo futuro?". Si la respuesta es "cualquiera", va en `platform/`, aunque hoy
  sólo lo use uno.
- **Verificación**: `server/module-boundaries.test.ts` (parte del scaffold, ver `plan.md` §13.3) lee los
  imports de cada archivo fuente y falla el build ante cualquier violación. Correr `npm test` antes de dar
  por cerrado cualquier spec que agregue o modifique un módulo.
- Extender el catálogo compartido de permisos (`permission`/`role`/`role_permission`, tablas) vía
  migraciones no viola esta regla — es infraestructura de datos compartida por diseño, la regla es sobre
  código de aplicación.

### 4.1. Cuándo un módulo necesita otro, de verdad

La regla de arriba es deliberadamente sin excepciones en la v1. Si en algún momento un módulo (C) necesita
de verdad algo de otro (A) — no por error, sino por una necesidad de negocio real, algo esperable en un
proyecto que crece dentro de este monolito modular — la resolución no es relajar la regla en general: es
agregar una excepción angosta y explícita, tratada como su propio spec, nunca como un ajuste silencioso
dentro de otro feature.

Antes de agregar el import, elegir según qué necesita C de A:

- **Sólo lectura** (p. ej. "¿existe este producto, está activo?") → A expone una función pública
  explícita en un archivo nuevo, chico y deliberado — `modules/A/public.ts` — con sólo lo que A decide que
  otros pueden llamar. C importa de ahí, nunca de `A/ports/`, `A/domain/`, `A/infra/` ni `A/api/`
  directamente. Es A quien controla su superficie pública, no quien la consume.
- **Escritura que necesita ser atómica junto con la propia** (p. ej. "crear el pedido Y descontar stock,
  las dos o ninguna") → A expone en ese mismo `public.ts` un caso de uso completo (`reserveStock(tx,
  productId, qty)`), no un repositorio — ya encapsula las llamadas internas de A. C lo importa y le pasa
  el `tx` compartido. Sigue siendo un import cruzado, pero acotado y explícito.
- **Si no hace falta atomicidad real** (el caso más común en la práctica) → ni siquiera compartir `tx`: C
  llama a la ruta HTTP de A (o a su función pública, sin pasar transacción), toma la respuesta, y sigue
  con su propia transacción aparte — es lo que pasaría si A ya fuera un microservicio.

**Por qué no alcanza con "importar el `ports/` porque total es sólo una interfaz"**: usar esa interfaz
requiere una instancia real, y esa instancia opera dentro de un `Transaction`. Si C pasa el mismo `tx` que
usa A, C queda atado a cómo A persiste sus datos — el import "liviano" esconde un acoplamiento real de
persistencia, justo lo que esta regla busca evitar.

**Mecánica del cambio, cuando aparezca la necesidad real**: `server/module-boundaries.test.ts` gana una
excepción angosta — un import cruzado se permite únicamente si apunta a `modules/<x>/public.ts`, nunca a
`ports/`, `domain/`, `infra/` ni `api/` de otro módulo. Esa excepción se agrega como su propio spec (qué
dos módulos, por qué, qué superficie exacta se expone), no como un ajuste silencioso — es el tipo de
decisión de diseño que amerita quedar escrita y revisada. Es el mismo concepto que en Domain-Driven Design
se llama *published interface* / *open host service* de un bounded context — no algo inventado para este
proyecto.

## 5. Arquitectura (front / server / DB)

- Backend: `server/modules/<módulo>/{ports,domain,infra,api}` + `server/platform/{config,db,http}`
  transversal — arquitectura hexagonal (Ports & Adapters) aplicada por módulo vertical. Código de
  referencia completo: `specs/001-scaffold-inicial/plan.md` de este mismo repo.
- Todo repositorio recibe `tx: Transaction`; ningún caso de uso toca `pg` fuera de `infra/`.
- Doble implementación por puerto (`*.repository.pg.ts` + `*.repository.in-memory.ts`).
- Frontend: React + Vite, cliente API tipado en `src/lib/api.ts` — sin `fetch` suelto en componentes.
- Migraciones: `.sql` numerados en `server/migrations/`, `node-pg-migrate`, bloques Up/Down explícitos.

### 5.1. Frontend — sistema de diseño

- **Priorizar componentes open source ya probados y masivamente usados por sobre desarrollar algo a
  mano.** Para cualquier necesidad de UI (tablas, diálogos, navegación, formularios, estados de carga,
  etc.), la primera opción es buscar si un componente estándar de shadcn/ui (u otra librería ya
  establecida en el proyecto) la cubre — recién si genuinamente no existe uno que resuelva la necesidad se
  justifica escribir código propio, y esa decisión se deja dicha explícitamente en el spec
  correspondiente, no se asume en silencio.
- Componentes de UI: shadcn/ui, estilo `new-york` (fijado en `components.json`) — se usa el código fuente
  real de cada primitivo, nunca una versión propia simplificada.
- Toda tabla de datos va envuelta en `Card` (`CardHeader` con `CardTitle` + la acción principal en
  `CardAction`, `CardContent` con la `Table`) — nunca una tabla suelta directo en la página.
- Estados booleanos (activo/inactivo, etc.) se muestran con `Switch`, nunca con un botón de texto que
  alterna.
- Colecciones cortas (roles, tags, permisos de un ítem) se muestran con `Badge`, no como texto separado
  por comas.
- Botones de acción (crear/editar/borrar) siempre con ícono de `lucide-react` adelante del texto.
- Diálogos de edición: estado local de formulario, se persiste sólo al confirmar `Guardar` — nunca
  escritura parcial a la API en cada cambio de campo o checkbox. `Cancelar` descarta sin persistir.
- Toda acción y toda sección de navegación (ítem de sidebar) está gateada por `hasPermission()` de
  `useAuth()` — no se muestra lo que el usuario no puede usar.
- Navegación: componente `Sidebar` real de shadcn/ui, con ícono + label por sección, colapso funcional
  (estado persistido, atajo `Cmd/Ctrl+B`) — no tabs horizontales, no un `<aside>` armado a mano ni un
  ícono de colapsar decorativo. Mismo patrón que `App.tsx` (§10.4).
- Menú de usuario: el área de usuario en el header (avatar + email) es el trigger de un `DropdownMenu`
  real de shadcn/ui (§10.1f), nunca un link de texto plano — con al menos un ítem "Cerrar sesión". Es el
  mismo patrón a seguir para cualquier acción nueva de cuenta que se agregue después (cambiar contraseña,
  preferencias, etc.): entra como ítem de este menú, no como un botón suelto más en el header.
- Columnas de acciones en una tabla (editar/borrar/marcar, etc.): la última columna, con el `TableHead`
  en `text-right` y los botones dentro de un contenedor `flex justify-end` — alineados a la derecha,
  nunca a la izquierda ni sueltos sin alinear.
- Paleta y tipografía: tokens de marca propios en `index.css` (§10.10) — color primario, acento, éxito,
  radios y las tres familias tipográficas (`--font-heading`/`--font-body`/`--font-mono`) — no la escala de
  grises que generaría `baseColor` por sí solo. Un módulo nuevo reusa estos tokens vía las clases de
  Tailwind (`bg-primary`, `text-muted-foreground`, etc.), nunca un color hardcodeado fuera de la paleta.
- Todo permiso del catálogo tiene una pantalla, **salvo que el spec de la feature diga explícitamente lo
  contrario** — por ejemplo, un permiso pensado sólo para acceso API-a-API (un servidor MCP, una
  integración con otro sistema, un script) que nunca se ejercita desde la UI. Es el default, no una regla
  absoluta: si un endpoint nuevo se gatea con `requirePermission(code)` y ese `code` no va a tener
  superficie de frontend, la excepción se declara en el `spec.md` correspondiente — no se asume en
  silencio ni queda como un olvido sin decir.
- El resultado de una acción que dispara el usuario (login, guardar, borrar, etc.) siempre llega a la
  pantalla — nunca sólo a la consola del navegador. El componente que ejecuta la acción de red no decide
  por sí solo qué hacer con un error: expone el resultado por `onSuccess`/`onError` (o equivalente) a quien
  lo monta, y ese padre es quien decide dónde mostrarlo (un texto bajo el control que disparó la acción, un
  toast, etc.) — pero el mensaje real que devolvió el servidor (`ApiRequestError.message`) es el que se
  muestra, no uno genérico inventado en el cliente. Mismo patrón en `AuthGate`/`LoginButton` (§10.4/§10.5).

## 6. Branching model: Gitflow

- `main` = producción, `develop` = integración.
- Cada spec se desarrolla en `feature/NNN-slug`, PR contra `develop`.
- `develop` se promueve a `main` por PR aparte, cuando el equipo decide desplegar.
- Nunca commit directo a `main` ni a `develop`.

## 7. Convenciones técnicas (no son regla de negocio de este proyecto)

- IDs `BIGSERIAL`/`BIGINT` — no UUID, decisión explícita (mejor localidad de índice + mitad de espacio
  para un monolito sin réplica entre sistemas; el control de acceso real es `authenticate`+
  `requirePermission`, no la unicidad del ID) — mapeados a `number` vía un helper `num()` en cada repo pg.
- Schema de Postgres propio del proyecto, nunca `public` — `{{DB_SCHEMA}}` (derivado del nombre del
  proyecto), fijado por `--schema --create-schema` en `node-pg-migrate` y por `search_path` en el pool de
  runtime. Ningún `CREATE TABLE` ni query necesita calificar el nombre de tabla con el schema.
- **Idioma: todo en inglés, sin excepción** — identificadores de código Y nombres de tabla/columna/schema.
  Proyecto greenfield, sin legado que migrar — no hay razón para mezclar idiomas como sí puede justificarse
  en un proyecto que hereda un modelo de datos preexistente en otro idioma. Los documentos de spec
  (`spec.md`/`plan.md`/`tasks.md`) siguen en español (§2) — la distinción es documento vs. código, no una
  excepción al inglés en el código.
- Catálogo de permisos plano: `permission(code PK, description)`, formato `recurso.acción[.calificador]`.
- M:N vía tablas puente explícitas con PK compuesta, `ON DELETE CASCADE` desde el lado padre.
- Validación de request body con Zod inline en cada ruta.
- Errores de dominio como clases (`class XError extends Error`), traducidos a status HTTP con
  `instanceof` en la capa `api/`.
- Config de entorno validada con Zod al import — falla cerrado antes de levantar el server.
- Tests: Vitest. Unitarios contra repos en memoria. Integración (`*.pg.test.ts`) contra Postgres real,
  `describe.skipIf(!process.env.DATABASE_URL)`, aislados con `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` dentro de
  una transacción externa también revertida.

## Referencias

- Patrón completo con código de referencia: `specs/001-scaffold-inicial/plan.md` de este repo.
```

### 11.2. `CLAUDE.md`

```markdown
# CLAUDE.md

Guía para trabajar en este repositorio con cualquier agente de código — ver también `AGENTS.md`.

## Leer primero, en este orden

1. **`requirements.md`** — los acuerdos fundamentales del proyecto (hosting, SDD, TDD, bajo acoplamiento
   entre módulos, arquitectura, branching). Es la fuente de verdad; ningún spec nuevo puede contradecirlo
   sin que el equipo lo decida explícitamente y actualice el documento primero.
2. **`specs/`** — el trabajo planificado y su estado, convención `spec.md`/`plan.md`/`tasks.md`. Ver la
   tabla de estado abajo.

## Estado del trabajo

| Spec | Estado | Contenido |
|---|---|---|
| `001-scaffold-inicial` | ✅ Generado | Auth + ABM de usuarios/roles, módulo de ejemplo `{{EXAMPLE_MODULE_NAME}}`, patrón de capas completo, bajo acoplamiento entre módulos verificado por test. |

*(Actualizar esta tabla en cada spec nuevo.)*

## Modo de trabajo acordado

Ver `requirements.md` — no se duplica acá para no desincronizar dos copias del mismo acuerdo.
```

### 11.3. `AGENTS.md`

```markdown
# AGENTS.md

Este archivo es un puntero, no la fuente. Las instrucciones completas para trabajar en este repo (con
cualquier agente: Claude Code, GitHub Copilot coding agent, u otro) viven en:

1. **`CLAUDE.md`** (raíz del repo) — leer primero. GitHub Copilot coding agent lo lee directamente además
   de este archivo, así que no se duplica acá: cualquier cambio de convención se edita en `CLAUDE.md`.
2. **`requirements.md`** (raíz del repo) — los acuerdos fundamentales (hosting, SDD, TDD, bajo
   acoplamiento entre módulos, arquitectura, branching, convenciones técnicas).

Se mantiene este archivo como puntero, no como copia, para que no queden dos fuentes de verdad
desincronizándose con el tiempo.
```

### 11.4. `templates/` — los 7 artefactos de SDD para specs futuros

`requirements.md` §2 exige que todo spec posterior a `001` siga el estándar real de spec-kit (`spec.md`
sin detalle técnico, `plan.md` sin código completo). Sin estos templates, esa regla queda como una frase
sin forma concreta que seguir. Se generan en `templates/`, en la raíz del proyecto instanciado — 7
archivos: `spec.md`/`plan.md`/`tasks.md` son obligatorios en todo spec; `research.md`/`data-model.md`/
`contracts/`/`quickstart.md` son opcionales, se usan cuando la feature tiene incógnitas técnicas,
entidades nuevas, superficie de API nueva, o conviene un runbook de verificación aparte — ver el resumen
para gente que no conoce SDD en el `README.md` del proyecto instanciado.

#### `templates/spec-template.md`

```markdown
# Spec: [Nombre de la feature]

**Feature branch:** `NNN-slug`
**Estado:** Draft
**Input:** [una frase: de dónde sale este pedido — un chat, un bug, una necesidad de negocio]

---

## Clarifications

*(Vacío hasta que haga falta resolver una ambigüedad. Formato:)*

### Session YYYY-MM-DD
- Q: <pregunta> → A: <respuesta>

## 1. Por qué existe

[2-4 oraciones: qué problema resuelve, para quién.]

## 2. Alcance

### Incluido
-

### Excluido (a propósito)
-

## 3. Usuarios y caso de uso

**Actor:**
**Historia de usuario:** Como <rol>, quiero <acción>, para <beneficio>.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | |

**Nada de detalle técnico acá** — sin nombres de tabla, de función, de librería, ni fragmentos de código.
Eso va en `plan.md` (y, si hace falta separarlo, en `data-model.md`/`contracts/`).

## 5. Criterios de aceptación (Given/When/Then)

1. **Dado** ..., **cuando** ..., **entonces** ...

## 6. Riesgos / decisiones abiertas
```

#### `templates/plan-template.md`

```markdown
# Plan técnico: [Nombre de la feature]

## 1. Resumen

[2-3 oraciones: el enfoque técnico elegido.]

## 2. Contexto técnico

- Lenguaje/versión, dependencias nuevas si las hay, storage, testing, plataforma.
- `[NEEDS CLARIFICATION: ...]` para cualquier incógnita técnica sin resolver — no adivinar; se resuelve
  en `research.md` antes de seguir.

## 3. Chequeo contra `requirements.md` (Constitution Check)

- [ ] Bajo acoplamiento y dirección de dependencias entre módulos (`requirements.md` §4) respetados — sin
  imports cruzados salvo hacia `platform/`, o hacia un `modules/<x>/public.ts` explícito (§4.1).
- [ ] Convenciones técnicas de `requirements.md` §7 respetadas (IDs, migraciones, Zod, errores de dominio,
  etc.).
- [ ] TDD aplicable — `tasks.md` va a intercalar tarea de test antes que su implementación, no agruparlas.
- Cualquier excepción a lo anterior se justifica acá, explícitamente — no se ignora en silencio.

## 4. Diseño

- Incógnitas técnicas → `research.md`.
- Entidades/relaciones nuevas o modificadas → `data-model.md`.
- Superficie de API nueva o modificada → `contracts/`.
- Escenario de verificación end-to-end → `quickstart.md`.

**No pegar código completo acá** — la excepción de `001-scaffold-inicial` (el spec que generó este
scaffold) no es el patrón a seguir para features nuevas, ver `requirements.md` §2.

## 5. Estructura de proyecto afectada

[Árbol de carpetas — qué archivos se tocan o se crean, no su contenido.]

## 6. Complejidad

[Justificar cualquier desvío de la opción más simple — si no hay ninguno, decirlo.]
```

#### `templates/tasks-template.md`

```markdown
# Tasks: [Nombre de la feature]

- [ ] **T000** Correr el análisis de consistencia cruzada (equivalente a `/analyze` de spec-kit — ver
  `README.md` §Flujo SDD para el prompt exacto) contra `spec.md`/`plan.md`/`tasks.md` de esta feature y
  `requirements.md`. De sólo lectura, no modifica ningún archivo. No seguir a T001 sin este paso hecho y
  sus hallazgos (si los hubo) resueltos.

## Fase 1 — [nombre]

- [ ] **T001** [Test] ...
- [ ] **T002** (T001) [Implementación] ...

*(TDD, `requirements.md` §3: cada bloque de trabajo intercala una tarea de test antes que su
implementación — nunca todos los tests agrupados al final.)*
```

#### `templates/research-template.md`

```markdown
# research.md: [Nombre de la feature]

Resuelve cada incógnita marcada `[NEEDS CLARIFICATION: ...]` en `plan.md` §2 — una entrada por incógnita,
antes de seguir a `data-model.md`/`contracts/`.

## [Nombre de la incógnita]

- **Decision:** [qué se eligió]
- **Rationale:** [por qué]
- **Alternatives considered:** [qué más se evaluó, y por qué se descartó]
```

#### `templates/data-model-template.md`

```markdown
# data-model.md: [Nombre de la feature]

El modelo, no el código que lo implementa — una entrada por entidad nueva o modificada.

## [NombreEntidad]

- **Campos:**
- **Relaciones:**
- **Reglas de validación:** (derivadas de los RF de `spec.md`)
- **Transiciones de estado:** (si aplica)
```

#### `templates/contracts-template.md`

```markdown
# contracts/: [Nombre de la feature]

Un archivo por endpoint o interfaz nueva/modificada, en `specs/NNN-slug/contracts/`. Formato por archivo:

## `MÉTODO /ruta`

- **Requiere permiso:** `recurso.acción`
- **Request:** [forma del body/params]
- **Response (200/201/...):** [forma]
- **Errores:** [status → cuándo]

Es el contrato, no el `Router` de Express — sin implementación.
```

#### `templates/quickstart-template.md`

```markdown
# quickstart.md: [Nombre de la feature]

Guía de verificación end-to-end, ejecutable a mano. **No incluye código de implementación**, ni cuerpos de
service/controller/migración, ni la suite de tests completa — eso vive en `tasks.md` y en el código.

1. [Paso concreto: comando o acción]
2. [Qué deberías ver/obtener]

## Resultado esperado

[Qué confirma que la feature funciona de punta a punta.]
```

## 12. Config files

### 12.1. `package.json` (`type` + scripts)

El proyecto es ESM de punta a punta — `tsconfig.server.json` resuelve con `NodeNext` (imports con sufijo
`.js` sobre fuente `.ts`) y `server/index.ts`/`server/module-boundaries.test.ts` usan `import.meta.url`/
`import.meta.dirname`, que sólo son válidos compilando a ESM. Sin `"type": "module"`, `tsc -p
tsconfig.server.json` falla (`TS1470`, `import.meta` no permitido en salida CommonJS).

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "server": "tsx watch server/index.ts",
    "migrate": "node-pg-migrate -m server/migrations --schema {{DB_SCHEMA}} --create-schema up",
    "migrate:down": "node-pg-migrate -m server/migrations --schema {{DB_SCHEMA}} --create-schema down",
    "build": "tsc -b --noCheck && vite build",
    "vercel-build": "npm run typecheck:server && npm run migrate && npm run build",
    "typecheck:server": "tsc -p tsconfig.server.json",
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

### 12.2. `tsconfig.server.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "strictNullChecks": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "isolatedModules": true
  },
  "include": ["server/**/*.ts", "api/**/*.ts"]
}
```

### 12.3. `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'src/lib/**/*.test.ts'],
  },
});
```

### 12.4. `.env.example`

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/{{DATABASE_NAME}}
DATABASE_SSL=disable
PORT=3001
AUTH_JWT_SECRET=changeme-generate-with-openssl-rand-hex-32
GOOGLE_CLIENT_ID=changeme-from-a-google-oauth-console
VITE_GOOGLE_CLIENT_ID=changeme-same-value-as-GOOGLE_CLIENT_ID
```

### 12.5. `tsconfig.json` (frontend)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strictNullChecks": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### 12.6. `vite.config.ts`

Proxy de `/api` hacia el backend en `:3001` (puerto fijo, §0) — en dev, el frontend en `:5000` y el
backend corren como dos procesos separados; en producción (Vercel) no hace falta, `api/index.ts` sirve
bajo el mismo dominio.

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5000,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

### 12.7. `index.html`

Las tres tipografías (§10.10) se cargan acá, vía Google Fonts — no hace falta instalar ningún paquete
para esto, son links estáticos.

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{PROJECT_NAME_TITLE}}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 12.8. `.gitignore`

```
node_modules/
dist/
.env
*.log
```

## 13. Testing

### 13.1. Unitario, repo en memoria (`server/modules/{{EXAMPLE_MODULE_NAME}}/{{EXAMPLE_MODULE_NAME}}.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { InMemory{{EXAMPLE_MODULE_NAME_PASCAL}}Repository } from './infra/{{EXAMPLE_MODULE_NAME}}.repository.in-memory.js';
import { validateTitle } from './domain/{{EXAMPLE_MODULE_NAME}}.js';

describe('validateTitle', () => {
  it('rechaza título vacío', () => {
    expect(validateTitle('')).not.toBeNull();
  });
  it('acepta título válido', () => {
    expect(validateTitle('Comprar licencias')).toBeNull();
  });
});

describe('InMemory{{EXAMPLE_MODULE_NAME_PASCAL}}Repository', () => {
  it('ciclo completo create → findById → update → deleteById', async () => {
    const repo = new InMemory{{EXAMPLE_MODULE_NAME_PASCAL}}Repository();
    const tx = {} as never;
    const created = await repo.create(tx, { title: 'Test', description: '' });
    expect(created.status).toBe('pending');

    const found = await repo.findById(tx, created.id);
    expect(found?.title).toBe('Test');

    const updated = await repo.update(tx, created.id, { status: 'done' });
    expect(updated?.status).toBe('done');

    const deleted = await repo.deleteById(tx, created.id);
    expect(deleted).toBe(true);
    expect(await repo.findById(tx, created.id)).toBeNull();
  });
});
```

### 13.2. Integración, arnés `SAVEPOINT` (patrón a replicar para cualquier `*.pg.test.ts` nuevo)

```ts
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

/**
 * Cada test corre en su propio SAVEPOINT, dentro de una transacción externa
 * que también se revierte — reproduce la semántica real de withTransaction()
 * (que abre su propia transacción por caso de uso) sin escribir nada
 * permanente. Sin esto, un `throw` dentro del código bajo test no revierte
 * nada y los tests de camino-de-error pasan por la razón equivocada.
 */
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

describe.skipIf(!HAS_DB)('ejemplo de integración contra Postgres real', () => {
  it('placeholder — reemplazar por el primer caso real del módulo', async () => {
    await inSavepoint(async (tx) => {
      const { rows } = await tx.query('SELECT 1 AS one', []);
      expect(rows[0].one).toBe(1);
    });
  });
});
```

### 13.3. `server/module-boundaries.test.ts` — verificación automática de RF-16

La aplicación mecánica de la regla de bajo acoplamiento y dirección de dependencias (§4): lee los `import`/`require` de cada archivo
fuente bajo `server/modules/` y `server/platform/`, y falla si alguno cruza el límite prohibido. Corre con
`vitest`, sin depender de configuración de eslint ni de disciplina de code review — se ejecuta en cada
`npm test`, igual que cualquier otro test.

```ts
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
```

## 14. Build & run

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, AUTH_JWT_SECRET, GOOGLE_CLIENT_ID
createdb {{DATABASE_NAME}}   # o el mecanismo de Postgres local que uses
npm run migrate
npm run server    # backend en :3001
npm run dev        # frontend en :5000, en otra terminal
npm test            # unitarios siempre; integración si DATABASE_URL está seteada
```

## 15. Cómo instanciar este scaffold para un proyecto real

Un solo prompt, una sola sesión, sin pausas intermedias — con `{{PROJECT_NAME}}` como único input real no
queda nada que revisar en los documentos antes de generar el código, así que no amerita separar "generar
el spec" de "ejecutarlo" en dos pasos. Tampoco amerita pausar antes de `npm run migrate`: al ser un schema
propio de un proyecto recién creado, sin datos existentes en riesgo, es tan reversible como borrar ese
schema — no es la misma situación que migrar una base compartida con datos reales. Si no hay Postgres
alcanzable (esperable en GitHub Copilot coding agent sin el setup de `README.md` §"Tests de integración:
limitación real en GitHub Copilot coding agent"), esas tareas quedan marcadas pendientes en `tasks.md`, no
bloqueadas. Prompt completo: `README.md` §"Cómo instanciar un proyecto nuevo". Versión corta acá:

```
Usá este scaffold (specs/001-scaffold-inicial/{spec,plan,tasks}.md) como
base literal para instanciar un proyecto nuevo llamado {{PROJECT_NAME}}.

{{PROJECT_NAME}} es el único placeholder que hace falta preguntar — el resto
(catálogo completo en plan.md §0) se resuelve solo: derivado, fijo, o con
un default seguro que se puede pisar si hace falta.

1. Generá los documentos del spec y CLAUDE.md/AGENTS.md/requirements.md
   (plan.md §11), con los placeholders resueltos.
2. Generá el código siguiendo tasks.md, corré npm install + npm test
   (sin Postgres).
3. Si hay Postgres alcanzable: migrá y validá a mano, sin pausar a
   preguntarme. Si no la hay: marcá esas tareas como pendientes por
   ausencia de Postgres y seguí con el resto — no es un bloqueo.

Mantené el mismo alcance del scaffold: auth + ABM completo, un módulo de
ejemplo genérico, patrón de capas ports/domain/infra/api, bajo acoplamiento
entre módulos verificado por server/module-boundaries.test.ts, schema
propio (nunca public), todo en inglés, arnés de tests SAVEPOINT desde el
día uno. No agregues nada nuevo todavía.
```
