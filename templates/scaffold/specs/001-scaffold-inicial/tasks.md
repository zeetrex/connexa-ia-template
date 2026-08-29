# Tasks: Scaffold de app full-stack con arquitectura vertical-hexagonal por módulo

Convención: `[ ]` pendiente, `[x]` hecho y verificado (no asumido). IDs con dependencias explícitas entre
paréntesis. Ejecutar en orden salvo que se indique paralelizable.

Escribir el código ya no es una tarea de este checklist — es determinístico
(`node scripts/instantiate.mjs {{PROJECT_NAME}}`, ver `plan.md` §15), no algo que un agente decida tarea
por tarea leyendo `plan.md`. Lo que sigue siendo trabajo real, y sigue necesitando criterio, es la
validación de que la instancia generada funciona de punta a punta — eso es lo que enumera este `tasks.md`.

## Fase 0 — Instanciación

- [ ] **T001** Correr `node scripts/instantiate.mjs {{PROJECT_NAME}}` — genera el proyecto completo
  (código + `CLAUDE.md`/`AGENTS.md`/`requirements.md`/`README.md`/`templates/`) desde
  `templates/scaffold/`, con los 4 placeholders derivados resueltos. Confirmar que el script terminó sin
  reportar ningún `{{...}}` sin resolver. Verificación cruzada de `requirements.md`/`CLAUDE.md`/`AGENTS.md`
  (spec.md criterio 11): `requirements.md` §4 ("Bajo acoplamiento y dirección de dependencias entre
  módulos") quedó íntegra, sin recortar; `AGENTS.md` es puntero, no copia — no repite contenido de
  `CLAUDE.md`/`requirements.md`.
- [ ] **T002** (T001) `cd` al proyecto generado, `npm install` — confirmar que resuelve sin error contra
  el registro npm público.

## Fase 1 — Tests, typecheck y build sin Postgres

- [ ] **T003** (T002) `npm test` sin `DATABASE_URL` seteada — confirmar que los unitarios pasan (incluido
  `server/module-boundaries.test.ts`) y los `*.pg.test.ts` se saltean limpio, sin fallar (spec.md
  criterio 9). Verificar que `module-boundaries.test.ts` realmente hace cumplir RF-16 — no sólo que corre,
  sino que detecta una violación real si se introduce una a mano de prueba.
- [ ] **T004** (T002) `npm run typecheck:server` limpio.
- [ ] **T005** (T002) `npm run build` limpio (`tsc -b --noCheck && vite build`) — y `npx tsc --noEmit`
  (sin `--noCheck`) también limpio, el chequeo real de tipos que el `build` normal enmascara.
- [ ] **T006** (T002) `npm run dev` — confirmar que el frontend levanta en `:5000` sin error de consola ni
  de build.

## Fase 2 — Validación contra Postgres real

- [ ] **T007** (T002) Verificar si hay una Postgres local alcanzable (`DATABASE_URL` resuelve). **Si no la
  hay** (esperable en GitHub Copilot coding agent sin el setup de `README.md` §"Tests de integración:
  limitación real en GitHub Copilot coding agent"): marcar T008–T013 como pendientes por ausencia de
  Postgres, no como bloqueadas, y saltar a Fase 3. **Si la hay**: seguir.
- [ ] **T008** (T007) `npm run migrate` — confirmar que las dos migraciones aplican sin error y que el
  seed del rol `Admin` tiene sus 11 permisos (7 base + 4 del módulo de ejemplo).
- [ ] **T009** (T008) `npm test` con `DATABASE_URL` apuntando a la Postgres migrada — confirmar que los
  tests de integración también pasan, corridos **dos veces seguidas**, para confirmar que el arnés
  `SAVEPOINT` no deja residuo (spec.md criterio 10).
- [ ] **T010** (T008) `npm run server` — confirmar `GET /api/health` → `200` sin sesión.
- [ ] **T011** (T010) Verificación manual del ciclo de auth con un ID token válido de Google (o firmado a
  mano con `jsonwebtoken` para simular, si no hay credenciales OAuth todavía): bootstrap del primer usuario
  → `active=true` + rol `Admin`; segundo usuario → `403` "esperando activación".
- [ ] **T012** (T011) Ciclo completo sobre `/api/admin/roles` (`POST`→`GET`→`PUT`→`DELETE`, rol sin
  usuarios asignados) → `201`/`200`/`200`/`204`. Intento de editar/borrar el rol `Admin` → `403`. Intento
  de borrar un rol con usuarios asignados → `409`.
- [ ] **T013** (T011) Ciclo completo sobre `/api/{{EXAMPLE_MODULE_PATH}}` (`POST`→`GET`→`PUT`→`DELETE`) →
  `201`/`200`/`200`/`204`, datos persistiendo correctamente entre pasos.

## Fase 3 — Cierre

- [ ] **T014** Marcar este `tasks.md` con el resultado real de cada tarea (no asumir nada como hecho sin
  haberlo corrido; lo pendiente por ausencia de Postgres queda marcado como tal, no como hecho) y dejar un
  resumen de qué quedó validado y qué sigue pendiente.

## Notas de alcance (recordatorio, ver `spec.md` §3)

- No incluye: base de test Postgres aislada, `server/` bajo el `tsconfig.json` raíz, CORS por origen, CI
  corriendo tests, refresh de sesión, test de integración adicional más allá del ejemplo de
  `{{EXAMPLE_MODULE_NAME}}.pg.test.ts` para otros módulos que se agreguen después. Todo eso es candidato a
  spec de seguimiento (`002-...` en adelante), no parte de esta v1.
