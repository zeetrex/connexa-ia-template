# Plan técnico: Scaffold de app full-stack con arquitectura vertical-hexagonal por módulo

> **Nota sobre este documento**: a diferencia del `plan.md` estándar de SDD (que fija decisiones técnicas
> y deja el código para la fase de `tasks.md` — ver `requirements.md` §2, §11 más abajo), este documento
> describe cómo se generó este proyecto, no una feature — es la copia, con los placeholders resueltos, del
> `plan.md` de `001-scaffold-inicial` de `connexa-ia-template` (el scaffold fuente), cuyo objetivo es
> reproducirse igual en cada instanciación, sin margen de diseño para quien lo ejecuta. El código en sí
> (`server/`, `src/`) es la referencia completa — ver §5-13 para el manifiesto de qué hace cada archivo. No
> es el patrón a seguir en ningún spec posterior a `001` de este proyecto.

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
placeholders en el código generado (`platform/config/env.ts`, `.env.example`, §14) — van con
`5000`/`3001` literales directamente.

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
   directorio, un test puede leer sus imports y fallar si algo cruza el límite — ver
   `server/module-boundaries.test.ts`. Con capas horizontales globales, esa regla no tiene un directorio
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
│   ├── module-boundaries.test.ts    ← verificación automática de RF-16
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
el código de `src/` ya se comprometió a usarlas, no es especulativo. `Badge` no necesita un paquete Radix
propio (es un `<span>` con variantes de `class-variance-authority`, reutiliza `Slot`). `tw-animate-css` la
usa el sistema de diseño (`src/index.css`) para las transiciones de componentes como `Dialog`/`Sidebar`. Si un
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
  — no en `public`); el pool de runtime (`platform/db/pool.ts`) fija el mismo `search_path` en cada conexión. Ningún nombre
  de tabla necesita ir calificado con el schema en ningún `CREATE TABLE` ni query.
- **Catálogo de permisos plano**: tabla `permission(code TEXT PK, description TEXT)`, formato
  `recurso.acción[.calificador]`. Agregar un permiso nuevo es una fila de seed en una migración futura,
  no una tabla normalizada `resource`×`action`.
- **Transacción por-caso-de-uso**: `withTransaction(fn)` — `BEGIN` → `fn(tx)` → `COMMIT` si no lanza,
  `ROLLBACK` si lanza, siempre libera el client. Ninguna ruta ni caso de uso abre su propia transacción.
- **Doble repo por puerto**: `*.repository.pg.ts` (SQL real) + `*.repository.in-memory.ts` (`Map`), misma
  interfaz — el segundo corre en tests sin Postgres.
- **Store compartido cuando dos repos tocan las mismas tablas**: ver
  `server/modules/auth/infra/in-memory-auth-store.ts` — `UserRepository` y
  `RoleRepository` en memoria comparten instancia para que un chequeo tipo "¿el rol tiene usuarios
  asignados?" vea lo que escribió el otro repo.
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
middleware `authenticate` se monta globalmente (`app.use('/api', authenticate)`, ver `server/index.ts`) — lo atraviesa
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
archivo, sin tocar nada de `modules/auth/` (`platform/http/authenticate.ts`). Ninguna dependencia cruza de `platform/` hacia un
módulo, en ninguna dirección.

**Regla general para cualquier módulo nuevo que se agregue después de este scaffold**: antes de poner algo
en `domain/` o `infra/` de un módulo, preguntar "¿esto lo va a necesitar sólo este módulo, o cualquier
módulo futuro?". Si la respuesta es "cualquiera", va en `platform/`, aunque hoy sólo lo use uno. La señal
de alarma es exactamente lo que pasó con `Transaction` y `verifySession` en la formulación ingenua de este
patrón: un tipo o función transversal que se queda en el primer módulo que lo necesitó, "porque ahí estaba
el código cuando hizo falta".

Distinto es el caso de un módulo que necesita algo de **otro módulo de dominio específico** (no algo
transversal a todos) — eso no va en `platform/`, y no es una violación a tolerar en silencio tampoco. Ver
`requirements.md` §4.1 (§11 más abajo) para el criterio completo.


## 5-13. Implementación — ver el código de este mismo proyecto

El código completo (antes embebido acá como bloques de markdown, en el `plan.md` del scaffold fuente) es
el árbol real de este proyecto — `server/`, `src/`, `api/` — generado por `connexa-ia-template` vía
`node scripts/instantiate.mjs {{PROJECT_NAME}}` a partir de `templates/scaffold/` de ese repo. Este
documento no lo transcribe: es el manifiesto de qué hace cada archivo, para orientarse sin tener que abrir
los ~40 uno por uno.

Manifiesto de archivos (path relativo a la raíz de este proyecto):

### `server/platform/` — capa transversal

| Archivo | Qué hace |
|---|---|
| `platform/config/env.ts` | Valida `process.env` con Zod al import — falla cerrado antes de levantar el server. |
| `platform/db/transaction.ts` | Contrato `Transaction` — genuinamente transversal, no le pertenece a ningún módulo (§4a). |
| `platform/db/pool.ts` | Pool de `pg`, con `search_path={{DB_SCHEMA}},public` fijo en cada conexión. |
| `platform/db/unit-of-work.ts` | `withTransaction(fn)` — BEGIN/COMMIT/ROLLBACK reusable. |
| `platform/http/session.ts` | `signSession`/`verifySession` — verificación vive en `platform/`, emisión en `auth` (§4b). |
| `platform/http/authenticate.ts` | Middleware que verifica la cookie de sesión, montado global en `/api`. |
| `platform/http/require-permission.ts` | Middleware `requirePermission(code)` — 403 si falta el permiso. |

### `server/modules/auth/` — login, sesión, ABM de usuarios y roles

| Archivo | Qué hace |
|---|---|
| `ports/user.repository.ts`, `ports/role.repository.ts` | Interfaces de los dos repositorios del módulo. |
| `domain/allowed-domains.ts` | Filtro de dominio de email permitido (`{{ALLOWED_EMAIL_DOMAINS}}`). |
| `domain/errors.ts` | `RoleInUseError`, `ProtectedRoleError` — errores de dominio como clases. |
| `infra/in-memory-auth-store.ts` | Store compartido entre los dos repos en memoria (misma tabla puente). |
| `infra/user.repository.{pg,in-memory}.ts` | Doble implementación del puerto de usuarios. |
| `infra/role.repository.{pg,in-memory}.ts` | Doble implementación del puerto de roles. |
| `api/auth.routes.ts` | `POST /google` (login + bootstrap), `/logout`, `GET /me`. |
| `api/admin.routes.ts` | ABM HTTP de usuarios y roles, gateado por permiso en cada ruta. |
| `auth.test.ts` | Unitario: store compartido, `RoleInUseError`/`ProtectedRoleError`. |
| `login.pg.test.ts` | Integración (arnés `SAVEPOINT`): bootstrap, segundo usuario inactivo, roles protegidos/en uso contra Postgres real. |

### `server/modules/{{EXAMPLE_MODULE_NAME}}/` — ABM genérico de referencia

| Archivo | Qué hace |
|---|---|
| `domain/{{EXAMPLE_MODULE_NAME}}.ts` | Entidad + `validateTitle()`. |
| `ports/{{EXAMPLE_MODULE_NAME}}.repository.ts` | Interfaz del puerto. |
| `infra/{{EXAMPLE_MODULE_NAME}}.repository.{pg,in-memory}.ts` | Doble implementación. |
| `api/{{EXAMPLE_MODULE_NAME}}.routes.ts` | ABM HTTP completo, sin ninguna dependencia de `auth`. |
| `{{EXAMPLE_MODULE_NAME}}.test.ts` | Unitario contra el repo en memoria. |
| `{{EXAMPLE_MODULE_NAME}}.pg.test.ts` | Integración (arnés `SAVEPOINT`) contra Postgres real. |

### `server/migrations/`

| Archivo | Qué hace |
|---|---|
| `0001_auth.sql` | Tablas `app_user`/`role`/`permission`/`role_permission`/`user_role`, catálogo base, seed `Admin` protegido. |
| `0002_{{EXAMPLE_MODULE_NAME}}.sql` | Tabla del módulo de ejemplo + sus 4 permisos, asignados a `Admin`. |

### Wiring

| Archivo | Qué hace |
|---|---|
| `server/index.ts` | Única raíz de composición — monta todos los módulos, `.listen()` sólo si es el entrypoint directo. |
| `api/index.ts` | Reexporta el mismo `app` para el bundling serverless de Vercel. |
| `server/module-boundaries.test.ts` | Verificación automática de RF-16 — lee imports, falla ante cualquier violación. |

### Frontend (`src/`)

| Archivo | Qué hace |
|---|---|
| `components.json` | Config de shadcn/ui — `style: new-york`, `baseColor: neutral`. |
| `src/lib/utils.ts` | `cn()`, usado por todo primitivo de `ui/`. |
| `src/components/ui/{switch,badge,sidebar,dropdown-menu,button,card,table,dialog,input,label,checkbox,sonner}.tsx` | Los 11 primitivos de shadcn/ui que el proyecto usa, código fuente completo. |
| `src/lib/api.ts` | Cliente API tipado — único lugar con `fetch`. `ApiRequestError` trae `status`/`method`/`url`/`requestBody`/`responseBody`/`rawResponseBody`/`isNetworkError`, no sólo `message`. |
| `src/lib/auth-context.tsx` | `AuthProvider`/`useAuth()` — sesión, permisos, `hasPermission()`. |
| `src/lib/error-debug.ts` | `buildErrorDebugPayload()` — arma el detalle técnico completo de un error para `ErrorDebugDialog`. |
| `src/components/ui/sonner.tsx` | Wrapper temático de `Toaster` (`sonner`) atado a los tokens de marca de `index.css`. |
| `src/components/ErrorDebugDialog.tsx` | Diálogo con el detalle técnico crudo de un error (status, request/response body) — incluye detección de errores de conexión a Postgres. |
| `src/App.tsx` | `AuthGate` (login + error visible en pantalla) + `Shell` (Sidebar real + DropdownMenu real, navegación gateada por permiso, `handleChildError`/`reportError` centralizando `toast.error` + `ErrorDebugDialog` para toda vista hija). |
| `src/components/LoginButton.tsx` | Google Identity Services — componente sin estado de red propio, `onSuccess`/`onError` por props. |
| `src/components/{UsersView,RolesView,{{EXAMPLE_MODULE_NAME_PASCAL}}View,DiagnosticsView}.tsx` | Las 4 pantallas del catálogo de permisos base. Las tres primeras reciben `onError` (§5.1 de `requirements.md`) y confirman éxito con `toast.success`; `DiagnosticsView` maneja su propio error localmente (es de sólo lectura). |
| `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts` | Entry point, tokens de marca (paleta + 3 tipografías), tipos de `import.meta.env`. |

### Memoria inicial del proyecto (multi-agente)

| Archivo | Qué hace |
|---|---|
| `CLAUDE.md`, `AGENTS.md`, `requirements.md` | Ver §11 más abajo — por qué existen y qué rol cumple cada uno. |
| `templates/*-template.md` (7 archivos) | Los artefactos de SDD para specs futuros (`002` en adelante) — ver `requirements.md` §2. |

### Config files

| Archivo | Qué hace |
|---|---|
| `package.json` | `"type": "module"` — obligatorio: `tsconfig.server.json` resuelve con `NodeNext` (imports con sufijo `.js` sobre fuente `.ts`) y `server/index.ts`/`module-boundaries.test.ts` usan `import.meta.url`/`import.meta.dirname`, válidos sólo compilando a ESM. Dependencias fijas de §2, scripts de build/test/migrate. |
| `tsconfig.server.json`, `tsconfig.json` | Chequeo de tipos separado para `server/`+`api/` vs. `src/`. |
| `vitest.config.ts`, `vite.config.ts` | Config de test y de dev server (proxy `/api` → `:3001`). |
| `.env.example`, `.gitignore`, `index.html` | Variables esperadas, ignorados de git, tipografías vía Google Fonts. |

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

Contenido completo en `requirements.md`, en la raíz de este proyecto.

### 11.2. `CLAUDE.md`

Contenido completo en `CLAUDE.md`, en la raíz de este proyecto.

### 11.3. `AGENTS.md`

Contenido completo en `AGENTS.md`, en la raíz de este proyecto.

### 11.4. `templates/` — los 7 artefactos de SDD para specs futuros

Contenido completo en `templates/`, en la raíz de este proyecto (`spec-template.md`,
`plan-template.md`, `tasks-template.md`, `research-template.md`, `data-model-template.md`,
`contracts-template.md`, `quickstart-template.md`) — usarlos para todo spec `002` en adelante.

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


## 15. Cómo se instanció este proyecto

Este proyecto (`{{PROJECT_NAME}}`) se generó corriendo `node scripts/instantiate.mjs {{PROJECT_NAME}}`
desde `connexa-ia-template` — copió `templates/scaffold/` de ese repo y sustituyó los placeholders de §0
de forma determinística, sin que ningún agente retipeara código. `tasks.md` de este spec documenta el
resultado real de la validación posterior (tests, build, y — si había Postgres alcanzable al momento de
instanciar — el ciclo funcional completo de auth/roles/módulo de ejemplo).

Si en algún momento hace falta instanciar **otro** proyecto nuevo con esta misma arquitectura, el punto de
partida es `connexa-ia-template` (no este repo) — ver su propio `README.md` §"Cómo instanciar un proyecto
nuevo".
