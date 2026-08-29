# Tasks: Scaffold de app full-stack con arquitectura vertical-hexagonal por módulo

Convención: `[ ]` pendiente, `[x]` hecho y verificado (no asumido). IDs con dependencias explícitas entre
paréntesis. Ejecutar en orden salvo que se indique paralelizable.

## Fase 0 — Bootstrap del repo

- [ ] **T001** Crear el directorio `{{PROJECT_NAME}}/` con `package.json` (§12.1),
  `tsconfig.server.json` (§12.2), `vitest.config.ts` (§12.3), `.env.example` (§12.4), `tsconfig.json`
  frontend (§12.5), `vite.config.ts` (§12.6), `index.html` (§12.7), `.gitignore` (§12.8).
- [ ] **T002** (T001) `npm install` — confirmar que resuelve sin error contra el registro npm público.
- [ ] **T003** (T001) Crear `README.md` del proyecto instanciado, con instrucciones de build & run
  (`plan.md` §14).

## Fase 1 — Memoria inicial multi-agente

- [ ] **T004** (T001) Generar `requirements.md` en la raíz, con los placeholders resueltos (`plan.md`
  §11.1). Revisar a mano la sección "Previews" de Vercel — es una decisión de proyecto, no tiene default.
  Confirmar que la sección "Bajo acoplamiento y dirección de dependencias entre módulos" (§4) quedó
  íntegra, sin recortar.
- [ ] **T005** (T004) Generar `CLAUDE.md` en la raíz (`plan.md` §11.2), con la tabla de estado inicial
  (sólo `001-scaffold-inicial`).
- [ ] **T006** (T004) Generar `AGENTS.md` en la raíz (`plan.md` §11.3) — confirmar que es puntero, no
  copia: no debe repetir contenido de `CLAUDE.md`/`requirements.md`.
- [ ] **T007** (T005, T006) Verificación cruzada: abrir el repo instanciado como si fuera Claude Code
  (¿encuentra `CLAUDE.md` y desde ahí `requirements.md`?) y como si fuera GitHub Copilot coding agent
  (¿encuentra `AGENTS.md` o el `CLAUDE.md` de raíz, y llega al mismo `requirements.md`?) — spec.md
  criterio de aceptación 11.
- [ ] **T008** (T001) Generar `templates/` en la raíz con los 7 archivos (`plan.md` §11.4):
  `spec-template.md`, `plan-template.md`, `tasks-template.md`, `research-template.md`,
  `data-model-template.md`, `contracts-template.md`, `quickstart-template.md`. Confirmar que
  `plan-template.md` no tiene código completo embebido en ningún ejemplo (sería contradecir la regla que
  el propio template exige) y que `tasks-template.md` trae `T000` (análisis de consistencia) como primera
  tarea.

## Fase 2 — Capa transversal (`server/platform/`)

- [ ] **T009** (T002) `platform/db/transaction.ts` — tipo `Transaction` cross-cutting (`plan.md` §4a).
- [ ] **T010** (T002) `platform/config/env.ts` con validación Zod (`plan.md` §5.1).
- [ ] **T011** (T010) `platform/db/pool.ts` (`plan.md` §5.2).
- [ ] **T012** (T009, T011) `platform/db/unit-of-work.ts` — `withTransaction()` (`plan.md` §5.3).
- [ ] **T013** (T010) `platform/http/session.ts` — `signSession`/`verifySession`, cross-cutting
  (`plan.md` §4b). **No debe importar nada de `modules/`.**
- [ ] **T014** (T013) `platform/http/authenticate.ts` — importa `verifySession` desde `./session.js`, no
  desde ningún módulo (`plan.md` §5.4).
- [ ] **T015** `platform/http/require-permission.ts` (`plan.md` §5.5).

## Fase 3 — Migraciones

- [ ] **T016** (T001) `server/migrations/0001_auth.sql` (`plan.md` §8.1) — incluye `role.protected` desde
  el día uno, catálogo base de permisos (`user.*`, `role.*`, `diagnostics.view`), seed del rol `Admin`.
- [ ] **T017** (T016) `server/migrations/0002_{{EXAMPLE_MODULE_NAME}}.sql` (`plan.md` §8.2).
- [ ] **T018** (T011, T016, T017) `npm run migrate` contra una Postgres local — confirmar que las dos
  migraciones aplican sin error y que el seed de `Admin` tiene sus 7 permisos + los 4 del módulo de
  ejemplo (11 en total).

## Fase 4 — Módulo `auth`

- [ ] **T019** (T012) `modules/auth/domain/errors.ts` (`plan.md` §6.4).
- [ ] **T020** `modules/auth/domain/allowed-domains.ts` con `{{ALLOWED_EMAIL_DOMAINS}}` resuelto
  (`plan.md` §6.3).
- [ ] **T021** `modules/auth/ports/user.repository.ts` + `ports/role.repository.ts` (`plan.md` §6.1/§6.2).
- [ ] **T022** (T021) `modules/auth/infra/in-memory-auth-store.ts` (`plan.md` §6.5).
- [ ] **T023** (T021, T009) `modules/auth/infra/user.repository.pg.ts` (`plan.md` §6.6).
- [ ] **T024** (T021, T022) `modules/auth/infra/user.repository.in-memory.ts` (`plan.md` §6.7).
- [ ] **T025** (T019, T021, T009) `modules/auth/infra/role.repository.pg.ts` (`plan.md` §6.8).
- [ ] **T026** (T019, T021, T022) `modules/auth/infra/role.repository.in-memory.ts` (`plan.md` §6.9).
- [ ] **T027** (T013, T020, T023) `modules/auth/api/auth.routes.ts` (`plan.md` §6.10) — confirmar que
  importa `signSession` desde `platform/http/session.js`, no desde ningún archivo de `domain/` propio.
- [ ] **T028** (T019, T023, T025) `modules/auth/api/admin.routes.ts` (`plan.md` §6.11).
- [ ] **T029** (T024, T026) Test unitario: ciclo `createUser` → `assignRole` (rol `Admin`) →
  `resolvePermissions` contra `InMemoryUserRepository`/`InMemoryRoleRepository` **compartiendo el mismo
  `InMemoryAuthStore`** — confirmar que el store compartido resuelve correctamente.
- [ ] **T030** (T029) Test unitario: `deleteRole()` sobre un rol con usuarios asignados lanza
  `RoleInUseError`; sobre el rol `Admin` lanza `ProtectedRoleError`.
- [ ] **T031** (T023, T025) `modules/auth/login.pg.test.ts` — arnés `SAVEPOINT` (`plan.md` §13.2,
  adaptado a `auth`), `describe.skipIf(!HAS_DB)`. Cubrir al menos: bootstrap de primer usuario, segundo
  usuario queda inactivo, `deleteRole` bloqueado por `ProtectedRoleError`/`RoleInUseError` contra datos
  reales.

## Fase 5 — Módulo de ejemplo `{{EXAMPLE_MODULE_NAME}}`

- [ ] **T032** `modules/{{EXAMPLE_MODULE_NAME}}/domain/{{EXAMPLE_MODULE_NAME}}.ts` (`plan.md` §7.1).
- [ ] **T033** (T032) Test unitario de `validateTitle()` — casos vacío, válido, > 200 caracteres
  (**TDD**: escribir este test antes que T034, según `requirements.md` §3 — es el primer módulo de negocio
  real del scaffold, entra bajo el estándar aunque `001-scaffold-inicial` en general esté exceptuado).
- [ ] **T034** (T033) `modules/{{EXAMPLE_MODULE_NAME}}/ports/{{EXAMPLE_MODULE_NAME}}.repository.ts`
  (`plan.md` §7.2).
- [ ] **T035** (T034, T009) `infra/{{EXAMPLE_MODULE_NAME}}.repository.pg.ts` (`plan.md` §7.3).
- [ ] **T036** (T034) `infra/{{EXAMPLE_MODULE_NAME}}.repository.in-memory.ts` (`plan.md` §7.4).
- [ ] **T037** (T036) Test unitario: ciclo completo `create → findById → update → deleteById` contra
  `InMemory{{EXAMPLE_MODULE_NAME_PASCAL}}Repository` (`plan.md` §13.1) — escrito **antes** de T038
  (TDD, mismo criterio que T033).
- [ ] **T038** (T035, T037) `api/{{EXAMPLE_MODULE_NAME}}.routes.ts` (`plan.md` §7.5) — confirmar que no
  importa nada de `modules/auth/`.
- [ ] **T039** (T035) `*.pg.test.ts` de integración para el módulo de ejemplo, mismo arnés `SAVEPOINT` que
  T031 — cubrir al menos el ciclo `create`/`update`/`deleteById` contra Postgres real.

## Fase 6 — Verificación de bajo acoplamiento y dirección de dependencias entre módulos

- [ ] **T040** (T027, T028, T038) `server/module-boundaries.test.ts` (`plan.md` §13.3).
- [ ] **T041** (T040) Correrlo y confirmar que pasa en verde tal como quedó generado el código — es la
  prueba de que RF-16 se sostiene desde el primer módulo, no sólo que el test compila.
- [ ] **T042** (T041) Verificación manual adicional, como doble chequeo: `grep -rn "from '.*modules/" server/platform/` no debe dar resultados; `grep -rln "modules/auth" server/modules/{{EXAMPLE_MODULE_NAME}}/` no debe dar resultados.

## Fase 7 — Wiring y arranque

- [ ] **T043** (T027, T028, T038) `server/index.ts` (`plan.md` §9) — confirmar que exporta `app` y que
  `.listen()` queda detrás del guard de entrypoint (`isMainModule`), no incondicional.
- [ ] **T044** (T043) `api/index.ts` (`plan.md` §9.1) — reexporta el mismo `app`, sin disparar un segundo
  `.listen()` gracias al guard de T043.
- [ ] **T045** (T018, T043) `npm run server` — confirmar `GET /api/health` → `200` sin sesión.
- [ ] **T046** (T045) Verificación manual con un ID token válido de un proveedor OAuth de Google (o
  firmado a mano con `jsonwebtoken` para simular, si no hay credenciales todavía): bootstrap del primer
  usuario → `active=true` + rol `Admin`; segundo usuario → `403` "esperando activación".
- [ ] **T047** (T046) Ciclo completo sobre `/api/admin/roles` (`POST`→`GET`→`PUT`→`DELETE`) con un rol
  nuevo sin usuarios asignados — confirmar códigos `201`/`200`/`200`/`204`.
- [ ] **T048** (T046) Intento de editar/borrar el rol `Admin` → `403`. Intento de borrar un rol con
  usuarios asignados → `409`.
- [ ] **T049** (T038, T046) Ciclo completo sobre `/api/{{EXAMPLE_MODULE_PATH}}` — confirmar códigos
  `201`/`200`/`200`/`204` y que los datos persisten entre pasos.

## Fase 8 — Frontend

- [ ] **T050** `components.json` (`plan.md` §10.1a) + `src/lib/utils.ts` (§10.1b) + primitivos de
  shadcn/ui, incluidos `switch.tsx` (§10.1c), `badge.tsx` (§10.1d), `sidebar.tsx` (§10.1e, versión
  acotada a escritorio — ver esa sección) y `dropdown-menu.tsx` (§10.1f) — si ejecuta una persona,
  `npx shadcn@latest init` + `add button card table dialog input label checkbox switch badge sidebar
  dropdown-menu`; si ejecuta un agente sin humano contestando el wizard interactivo, escribir los
  primitivos a mano siguiendo §10.1.
- [ ] **T051** `src/lib/api.ts` (`plan.md` §10.2, incluye `createRole`/`updateRole`/`deleteRole`).
- [ ] **T052** (T051) `src/lib/auth-context.tsx` (`plan.md` §10.3).
- [ ] **T053** `src/components/LoginButton.tsx` (`plan.md` §10.5) — Google Identity Services cargado en
  runtime; requiere `VITE_GOOGLE_CLIENT_ID` en `.env` (`plan.md` §12.4).
- [ ] **T054** (T050, T051) `src/components/UsersView.tsx` (`plan.md` §10.6) — listar, activar/desactivar
  con `Switch`, roles como `Badge`, asignar roles con diálogo `Cancelar`/`Guardar`.
- [ ] **T055** (T050, T051) `src/components/RolesView.tsx` (`plan.md` §10.7) — listar/crear/editar/borrar,
  checklist de permisos, mismo sistema de diseño que `UsersView`.
- [ ] **T056** (T050, T051) `src/components/{{EXAMPLE_MODULE_NAME_PASCAL}}View.tsx` (`plan.md` §10.8) —
  ABM del módulo de ejemplo, mismo sistema de diseño.
- [ ] **T057** (T050, T051) `src/components/DiagnosticsView.tsx` (`plan.md` §10.8a) — superficie de
  frontend para `diagnostics.view`, mismo criterio que cualquier otro permiso del catálogo base: si el
  permiso existe, tiene pantalla.
- [ ] **T058** (T052, T053, T054, T055, T056, T057) `src/App.tsx` — shell con sidebar navegable, gateada
  por permisos (`plan.md` §10.4).
- [ ] **T059** `src/index.css` (`plan.md` §10.10).
- [ ] **T060** `src/vite-env.d.ts` (`plan.md` §10.11) — sin esto, `LoginButton.tsx` (T053) y el import de
  `index.css` (T061) no tipan bajo `tsc --noEmit` estricto (`npm run build` usa `--noCheck`, que lo tapa).
- [ ] **T061** (T058, T059, T060) `src/main.tsx` (`plan.md` §10.9).
- [ ] **T062** (T061) `npm run dev` — confirmar que el frontend levanta en `:5000` sin error de consola ni
  de build. **No hace falta verificación manual en el navegador** — no es viable en la mayoría de los
  entornos donde esto se ejecuta (sin browser interactivo, sin credenciales reales de Google OAuth). La
  verificación funcional real ya la cubren T046–T049 (backend, por HTTP directo, sin navegador) — acá sólo
  se confirma que el frontend compila y sirve.

## Fase 9 — Tests, build, cierre

- [ ] **T063** (T029–T031, T033, T037, T039, T041) `npm test` sin `DATABASE_URL` — confirmar que los
  unitarios pasan (incluido `module-boundaries.test.ts`) y los `*.pg.test.ts` se saltean limpio (spec.md
  criterio 9).
- [ ] **T064** (T063) `npm test` con `DATABASE_URL` apuntando a Postgres local migrada — confirmar que los
  de integración también pasan, y correr la suite **dos veces seguidas** para confirmar que el `SAVEPOINT`
  no deja residuo (spec.md criterio 10).
- [ ] **T065** (T010, T043) `npm run typecheck:server` limpio.
- [ ] **T066** (T050–T061) `npm run build` limpio (`tsc -b --noCheck && vite build`) — y `npx tsc
  --noEmit` (sin `--noCheck`) también limpio, el chequeo real de tipos que el `build` normal enmascara.
- [ ] **T067** Marcar este `tasks.md` con el resultado real de cada tarea (no asumir nada como hecho sin
  haberlo corrido) y dejar un resumen de qué quedó validado y qué sigue pendiente.

## Notas de alcance (recordatorio, ver `spec.md` §3)

- No incluye: base de test Postgres aislada, `server/` bajo el `tsconfig.json` raíz, CORS por origen, CI
  corriendo tests, refresh de sesión, test de integración adicional más allá del ejemplo de T039 para
  otros módulos que se agreguen después. Todo eso es candidato a spec de seguimiento (`002-...` en
  adelante), no parte de esta v1.
