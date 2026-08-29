# Spec: Scaffold de app full-stack con arquitectura vertical-hexagonal por módulo

**Feature branch:** `001-scaffold-inicial`
**Estado:** Draft
**Input:** Diseño de arquitectura basado en Ports & Adapters (hexagonal) aplicado por módulo/vertical
slice, con un módulo de auth + ABM de usuarios y roles como caso de referencia completo, y un módulo de
ejemplo genérico adicional.

---

## 1. Por qué existe este spec

Arrancar una app full-stack nueva (frontend + backend + base de datos, un repo, un ciclo de deploy propio)
sin un scaffold de referencia obliga a redecidir, cada vez, las mismas diez cosas: cómo separar dominio de
infraestructura, cómo testear sin depender de una base real, cómo modelar permisos, cómo estructurar
migraciones, y qué documento le explica a alguien nuevo — humano o agente de código — cómo está armado el
proyecto. Tomadas ad-hoc cada vez, esas decisiones divergen entre proyectos y acumulan atajos que después
cuestan corregir.

Este spec las fija una vez, como scaffold instanciable en cualquier entorno: primero QUÉ (este documento),
después CÓMO (`plan.md`, con el código completo capa por capa), después el checklist ejecutable
(`tasks.md`). El scaffold es autocontenido — no requiere conocer ningún otro proyecto para entenderse ni
para instanciarse; toda decisión de diseño está justificada acá por su mérito técnico, no por precedente.

**Principio de diseño central: bajo acoplamiento y dirección de dependencias entre módulos.** El backend
se organiza en módulos verticales (`server/modules/<módulo>/{ports,domain,infra,api}`), cada uno un
hexágono completo (Ports & Adapters) autocontenido. Dos principios de diseño de paquetes con nombre propio
sostienen ese aislamiento — forzados por el código generado y por un test automático, no sólo enunciados
en un documento: **bajo acoplamiento** (ningún módulo importa código de aplicación de otro módulo de
dominio) y **dirección de dependencias hacia la capa estable** (*Stable Dependencies Principle* — la capa
transversal `server/platform/` nunca depende de ningún módulo de dominio; sólo al revés). Ver RF-16 y
`requirements.md` §4 en `plan.md` §11.

Por qué es fácil violarla sin darse cuenta, y por qué el síntoma no es un error de compilación sino un
módulo que en realidad no se puede extraer: ver `plan.md` §4.

## 2. Forma del proyecto instanciado

Repo único full-stack: frontend (Vite + React + TypeScript) y backend (Express + TypeScript) en el mismo
repo, un Postgres compartido, un solo ciclo de deploy. Sin separación en múltiples repos ni librerías
internas publicadas — todo el código vive en un lugar, organizado por módulo vertical.

## 3. Alcance

### Incluido

- Repo único full-stack: Vite + React 18 + TS + Tailwind/shadcn (frontend), Express + TS (backend),
  Postgres vía `node-pg-migrate` con migraciones `.sql` numeradas.
- Patrón de capas completo por módulo backend: `server/modules/<módulo>/{ports,domain,infra,api}` +
  `server/platform/{config,db,http}` transversal, con bajo acoplamiento y dirección de dependencias entre
  módulos aplicados desde el primer módulo generado (RF-16).
- **Auth + ABM completo desde el día uno**: login Google OAuth, sesión JWT en cookie httpOnly con permisos
  resueltos al login, middleware `authenticate`/`requirePermission`, catálogo de permisos plano
  (`recurso.acción[.calificador]`), bootstrap de primer usuario (activo + rol `Admin` automático), rol
  `Admin` protegido por flag (no por nombre), ABM de usuarios (listar/activar/desactivar/asignar roles) y
  roles (crear/editar/borrar/permisos), pantallas de frontend correspondientes.
- **Un módulo de ejemplo genérico adicional** (`{{EXAMPLE_MODULE_NAME}}`, placeholder — ver `plan.md` §0)
  que demuestra el mismo patrón de capas aplicado a una entidad de dominio simple, sin ninguna dependencia
  del módulo de auth ni de ningún otro módulo de dominio — su único acoplamiento es a `platform/`.
- **Test automático de límites entre módulos** (`server/module-boundaries.test.ts`) que falla si algún
  módulo importa código de aplicación de otro módulo de dominio, o si `platform/` importa de un módulo —
  la aplicación mecánica de RF-16, no sólo una convención escrita.
- Doble implementación por puerto (`*.repository.pg.ts` + `*.repository.in-memory.ts`) para poder testear
  sin Postgres.
- Patrón `Transaction`/`withTransaction` (BEGIN/COMMIT/ROLLBACK), definido en `server/platform/db/` —
  ningún caso de uso toca `pg` directo fuera de `infra/`, y ningún módulo de dominio define ni presta este
  tipo a otro.
- Tests con Vitest: unitarios contra repos en memoria, e integración contra Postgres real con arnés
  `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` — aísla cada test sin dejar residuo, incluso cuando el código bajo
  prueba abre su propia transacción.
- Deploy a Vercel: build en tres pasos encadenados — typecheck del backend, migración de esquema, build del
  bundle — cada paso falla cerrado si el anterior falla.
- **Memoria inicial del proyecto para múltiples agentes de código** (`CLAUDE.md` + `AGENTS.md` +
  `requirements.md` en la raíz del proyecto instanciado) — este scaffold lo instancian y ejecutan personas
  distintas desde herramientas distintas (Claude Code, GitHub Copilot coding agent vía web, y
  potencialmente otras), no sólo quien lo generó. Ver RF-14/RF-15 y `plan.md` §11.
- **Templates de los 7 artefactos de SDD + análisis de consistencia obligatorio**, para que la regla de
  `requirements.md` §2 ("los specs posteriores a `001` siguen el estándar real de spec-kit") tenga un
  esqueleto concreto que seguir en vez de quedar sólo en prosa. Ver RF-17/RF-18 y `plan.md` §11.4.

### Excluido a propósito (primera iteración)

Cada uno de estos es una decisión explícita de acotar el alcance de la v1, documentada acá para que quien
la retome sepa que es intencional, no un olvido:

- **Base de datos de test aislada** — los tests de integración corren contra la misma base de desarrollo,
  protegidos por el rollback del `SAVEPOINT`. Resolverlo (base `_test` dedicada + `globalSetup` de Vitest)
  es candidato a spec de seguimiento, no bloquea la v1.
- **`server/` bajo el mismo `tsconfig` que el frontend** — se type-chequea aparte
  (`tsconfig.server.json`, script `typecheck:server`), no como parte de un único chequeo de todo el repo.
- **CORS por origen / hardening adicional de red** — `cors()` sin restringir por default.
- **CI que corra tests** — no se agrega en este scaffold.
- **Refresh token / renovación de sesión** — la sesión JWT dura 8hs fijas, sin refresh. Trade-off aceptado
  explícitamente: activar/inactivar un usuario no tiene efecto hasta que expire su sesión.
- **Tests de integración de repositorio para el módulo de ejemplo** — lleva tests unitarios (repo en
  memoria) completos; el test de integración contra Postgres real queda como tarea documentada en
  `tasks.md`, con el mismo arnés que ya usa `auth`.

## 4. Usuarios y caso de uso

**Actor:** developer que necesita levantar una app full-stack nueva — con auth y permisos funcionando
desde el día uno, y un módulo de ejemplo que demuestre el patrón de capas — sin partir de cero ni
redescubrir a mano las convenciones de `ports/domain/infra/api`, `withTransaction`, el catálogo de
permisos, y el arnés de tests contra Postgres.

**Historia de usuario:**
> Como developer, quiero instanciar un scaffold ya validado arquitectónicamente, con auth y ABM de
> usuarios/roles funcionando, y un módulo de ejemplo que demuestre el patrón — para tener en minutos una
> app que compila, levanta, autentica, y tiene un ABM end-to-end con tests — sin tener que decidir de nuevo
> cómo separar capas, cómo evitar que los módulos se acoplen entre sí sin querer, ni cómo dejarle a
> cualquier agente de código (no sólo el que lo generó) un mapa claro de las reglas del proyecto.

## 5. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | `npm install && npm run migrate && npm run server` levanta el backend en `:3001`; `npm run dev` levanta el frontend en `:5000` — puertos fijos, no placeholder (ver `plan.md` §0). |
| RF-02 | `GET /api/health` responde `200 OK` sin autenticación. |
| RF-03 | El login Google (`POST /api/auth/google`) verifica el ID token, filtra por `{{ALLOWED_EMAIL_DOMAINS}}`, y hace bootstrap: primer usuario de una base vacía → `active=true` + rol `Admin`; siguientes → `active=false` hasta que un Admin los active. |
| RF-04 | La sesión se emite como JWT en cookie `httpOnly`, con los permisos resueltos una única vez al login (no por-request), TTL fijo de 8hs, sin refresh. |
| RF-05 | Todo endpoint bajo `/api` (salvo `/api/auth/*` y `/api/health`) exige `authenticate`; cada ruta de negocio exige además `requirePermission(<code>)` específico. |
| RF-06 | El ABM de usuarios expone: listar (con sus roles), activar/desactivar, reemplazar el set de roles asignados — gateado por `user.view`/`user.edit`. |
| RF-07 | El ABM de roles expone: listar (con permisos y cantidad de usuarios), crear, editar (nombre/descripción/permisos), borrar — gateado por `role.view`/`role.create`/`role.edit`/`role.delete`. El rol marcado `protected=true` (seed `Admin`) rechaza edición/borrado con `403`; un rol con usuarios asignados rechaza el borrado con `409`. |
| RF-08 | `GET /api/admin/permissions` devuelve el catálogo completo de permisos (código + descripción), para que el frontend arme el checklist de un rol sin duplicar el catálogo. |
| RF-09 | El módulo de ejemplo (`{{EXAMPLE_MODULE_NAME}}`) expone un ABM completo (crear, obtener por id, listar, actualizar, eliminar) siguiendo el mismo patrón `ports/domain/infra/api`, gateado por sus propios permisos (`{{EXAMPLE_MODULE_NAME}}.view`/`.create`/`.edit`/`.delete`, sumados al catálogo), sin ninguna dependencia de código del módulo de auth. |
| RF-10 | Todo repositorio recibe `tx: Transaction` como primer parámetro; ningún caso de uso ni ruta llama a `pg` directamente fuera de `infra/`. |
| RF-11 | El esquema y sus migraciones se aplican vía `npm run migrate` (`node-pg-migrate` sobre `.sql` numerados en `server/migrations/`) — el arranque del server no ejecuta DDL. |
| RF-12 | `npm test` corre unitarios (repos en memoria) sin necesitar Postgres, e integración (`*.pg.test.ts`) contra Postgres real si `DATABASE_URL` resuelve — con `describe.skipIf(!HAS_DB)`, nunca fallando por su ausencia. Ojo: cada `*.pg.test.ts` hace `import 'dotenv/config'`, que lee `DATABASE_URL` de un archivo `.env` en disco si existe — "sin `DATABASE_URL` seteada" significa que no hay `.env` con esa clave, no sólo que la shell no la exporte; con `.env` presente, los tests de integración corren aunque la shell no tenga la variable. |
| RF-13 | El arnés de test de integración aísla cada test con `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` dentro de una transacción externa que también se revierte — no un doble que entregue la transacción del test sin abrir una anidada, que no modelaría el rollback real de `withTransaction`. |
| RF-14 | El proyecto instanciado incluye `requirements.md` en la raíz: los acuerdos fundamentales que todo spec nuevo debe respetar — hosting en Vercel, SDD obligatorio por feature, TDD como estándar desde el primer spec real, el patrón de arquitectura front/server/DB (con puntero al `plan.md` de este scaffold como referencia de código), Gitflow como branching model, el bajo acoplamiento y dirección de dependencias entre módulos (RF-16), y las convenciones técnicas de este scaffold — explícitamente separadas de cualquier regla de negocio propia del proyecto instanciado. |
| RF-15 | El proyecto instanciado incluye `CLAUDE.md` (contenido completo, con la tabla de estado de specs) y `AGENTS.md` (puntero corto a `CLAUDE.md` + `requirements.md`, no una copia) en la raíz — para que el mismo conjunto de reglas sea legible tanto por Claude Code como por GitHub Copilot coding agent (que lee `AGENTS.md` anidado, `.github/copilot-instructions.md`, y también un `CLAUDE.md` de raíz directamente) sin mantener dos fuentes de verdad. |
| RF-16 | Ningún módulo (`server/modules/<x>/{ports,domain,infra,api}`) importa un archivo de `ports/domain/infra/api` de otro módulo de dominio. `server/platform/` nunca importa de ningún módulo de dominio — la dependencia sólo puede ir de un módulo hacia `platform/`, nunca al revés. La única excepción es `server/index.ts` (la raíz de composición), que sí conoce todos los módulos para montarlos. `server/module-boundaries.test.ts` verifica esto automáticamente, leyendo los `import` de cada archivo fuente y fallando ante cualquier violación — sin depender de configuración de eslint ni de disciplina manual. |
| RF-17 | El proyecto instanciado incluye `templates/` en la raíz con los 7 artefactos del estándar spec-kit (`spec-template.md`, `plan-template.md`, `tasks-template.md`, `research-template.md`, `data-model-template.md`, `contracts-template.md`, `quickstart-template.md`) — para que todo spec posterior a `001` tenga un esqueleto concreto que seguir, no sólo la regla en prosa de `requirements.md` §2. |
| RF-18 | `requirements.md` exige, para todo spec posterior a `001`, un paso de análisis de consistencia cruzada (equivalente a `/analyze` de spec-kit) entre `spec.md`/`plan.md`/`tasks.md` y `requirements.md`, antes de empezar a implementar — de sólo lectura, registrado como la tarea `T000` de `tasks.md`. |

## 6. Requisitos no funcionales / convenciones

- **IDs**: `BIGSERIAL`/`BIGINT` en Postgres, `number` en TS/JSON — no UUID. `node-postgres` devuelve
  `BIGINT`/`BIGSERIAL` como `string`; todo mapper de fila pasa el campo por un helper `num()` antes de
  exponerlo como `number`. Decisión explícita, no la única opción válida: para un monolito de un solo
  equipo, con una sola base, sin réplica hacia otros sistemas, `BIGSERIAL` da mejor localidad de índice
  (inserta secuencial, no fragmenta el B-tree como sí hace un UUID v4 random) y la mitad de espacio en
  disco — a costa de ser enumerable. Esa exposición no es el control de acceso real: todo endpoint ya exige
  `authenticate` + `requirePermission` (RF-05), así que adivinar que existe el id `42` no alcanza para
  leerlo. UUID sería la elección correcta si este proyecto necesitara generar IDs sin depender de una
  secuencia central (múltiples sistemas escribiendo, réplica entre bases) — no es el caso de este scaffold.
- **Sin prefijo de tabla por dominio** — nombres de tabla en snake_case, sin prefijo (`app_user`, `role`,
  `{{EXAMPLE_ENTITY_TABLE}}`). Si el proyecto instanciado va a convivir con otros dominios en la misma
  base de datos, evaluar en ese momento si corresponde un prefijo — no es una regla universal, es el
  default de este scaffold para un proyecto de un solo dominio.
- **Schema de Postgres propio por proyecto, nunca `public`** — `{{DB_SCHEMA}}` (derivado del nombre del
  proyecto, §8). Se logra con `node-pg-migrate --schema {{DB_SCHEMA}} --create-schema` (fija el
  `search_path` de la corrida y crea el schema si no existe, incluida la tabla de tracking de migraciones)
  y con el mismo `search_path` en el pool de conexión de runtime — ningún `CREATE TABLE` ni query
  individual necesita calificar el nombre de tabla con el schema.
- **Idioma: todo en inglés, sin excepción** — identificadores de código y nombres de tabla/columna/schema.
  Proyecto greenfield, sin legado en otro idioma que migrar. Los documentos de spec siguen en español —
  ver `requirements.md` §2, es una distinción de documento vs. código, no una excepción al inglés en el
  código en sí.
- **Migraciones**: archivos `.sql` numerados secuenciales (`NNNN_slug.sql`), con bloques
  `-- Up Migration` / `-- Down Migration` explícitos, corridos por `node-pg-migrate -m server/migrations
  up`. Aditivas por defecto.
- **Catálogo de permisos plano**: tabla `permission(code PK, description)`, formato de código
  `recurso.acción[.calificador]` (ej. `user.view`, `role.edit`, `{{EXAMPLE_MODULE_NAME}}.view`). Agregar un
  permiso nuevo es una fila de seed en una migración, no una tabla normalizada `resource`×`action`. Esta
  tabla (junto con `role`/`role_permission`) es infraestructura compartida por diseño — cualquier módulo
  puede sumarle filas vía su propia migración; eso no viola RF-16, que es sobre código de aplicación
  (`ports/domain/infra/api`), no sobre datos de catálogo compartido.
- **M:N vía tablas puente explícitas**: `user_role(user_id, role_id)`, `role_permission(role_id,
  permission_code)`, ambas con `ON DELETE CASCADE` desde el lado padre y `PRIMARY KEY` compuesta.
- **Rol protegido, no rol con nombre mágico**: `role.protected BOOLEAN` — el código nunca compara
  `name === 'Admin'` para decidir si algo se puede editar/borrar.
- **Transacción por-caso-de-uso**: `withTransaction(fn)` abre `BEGIN`, corre `fn(tx)`, hace `COMMIT` si
  no lanza o `ROLLBACK` si lanza, y siempre libera el client. Un handler HTTP nunca abre su propia
  transacción a mano. El tipo `Transaction` vive en `server/platform/db/` — es transversal por definición,
  ningún módulo de dominio lo define ni lo presta a otro (RF-16).
- **Verificación de sesión como infraestructura, no como dominio**: `authenticate` (el middleware que
  gatea toda la API) sólo necesita el secreto compartido para verificar un JWT — no necesita nada más del
  módulo que emite sesiones. Por eso la verificación vive en `platform/`, y sólo la *emisión* (login,
  bootstrap) vive en el módulo de auth — separar estas dos cosas es lo que mantiene a `platform/` libre de
  depender hacia atrás de un módulo de dominio (RF-16).
- **Doble repo por puerto**: `*.repository.pg.ts` (SQL real, con `num()` para BIGINT/BIGSERIAL) y
  `*.repository.in-memory.ts` (Map en memoria) implementando la misma interfaz — el segundo es lo que
  corre en tests sin Postgres.
- **Store en memoria compartido cuando dos repos tocan las mismas tablas**: si dos repositorios de un
  mismo módulo (en memoria) necesitan ver las mismas asignaciones (p. ej. usuario↔rol), comparten una
  instancia de store en vez de tener cada uno su propio `Map` aislado — si no, un chequeo como "¿este rol
  tiene usuarios asignados?" no ve lo que el otro repo escribió.
- **Errores de dominio como clases, no strings**: clases que extienden `Error` en `domain/errors.ts` de
  cada módulo — la ruta HTTP las traduce a status code con `instanceof`, no parseando el mensaje.
- **DTOs vía Zod, no clases separadas**: los `Router` de Express validan el body con
  `z.object({...}).safeParse()` inline.
- **Branching: Gitflow** — `main` (producción) / `develop` (integración) / `feature/NNN-slug` por spec,
  PR a `develop`, y `develop` → `main` por PR aparte cuando el equipo decide desplegar. Nunca commit
  directo a `main`/`develop`.
- **TDD desde el primer spec de feature real** — el propio `001-scaffold-inicial` es la excepción
  declarada (no hay nada previo contra qué escribir un test antes de generar el scaffold); todo spec
  posterior implementa cada requisito test-first.
- **Bajo acoplamiento y dirección de dependencias entre módulos, forzados por código** — ver RF-16. Es la
  convención más importante de esta lista porque las demás son locales a un módulo; ésta es la única que,
  si se rompe, degrada silenciosamente el resto del sistema sin que ningún test unitario del módulo
  afectado lo detecte.

## 7. Criterios de aceptación (Given/When/Then)

1. **Dado** el repo recién instanciado con placeholders reemplazados y una Postgres local corriendo,
   **cuando** se corre `npm install && npm run migrate`, **entonces** el esquema se crea sin error,
   incluido el seed del rol `Admin` con su catálogo de permisos.
2. **Dado** el backend corriendo (`npm run server`), **cuando** se hace `GET /api/health`, **entonces**
   responde `200` sin necesitar sesión.
3. **Dado** una base recién migrada (vacía de usuarios), **cuando** el primer usuario hace login con un
   ID token de Google válido de un dominio permitido, **entonces** queda `active=true` con rol `Admin`, y
   `GET /api/auth/me` devuelve el 100% de los permisos del catálogo.
4. **Dado** un segundo usuario que hace login, **cuando** todavía no fue activado, **entonces**
   `POST /api/auth/google` responde `403` con mensaje "esperando activación".
5. **Dado** un Admin autenticado, **cuando** hace el ciclo completo sobre `/api/admin/roles`
   (`POST` crear → `GET` listar → `PUT` editar → `DELETE` borrar de un rol sin usuarios asignados),
   **entonces** cada paso responde el código esperado (`201`/`200`/`200`/`204`).
6. **Dado** un intento de editar o borrar el rol `Admin` (`protected=true`), **cuando** se hace la request,
   **entonces** responde `403`, sin importar los permisos del usuario.
7. **Dado** un rol con al menos un usuario asignado, **cuando** se intenta `DELETE`, **entonces** responde
   `409`.
8. **Dado** el ciclo completo `POST → GET/{id} → PUT → DELETE` sobre `/api/{{EXAMPLE_MODULE_PATH}}`,
   **entonces** cada paso responde el código HTTP esperado y los datos persisten correctamente entre pasos.
9. **Dado** el set de tests unitarios del repo, **cuando** se ejecuta `npm test` sin `DATABASE_URL`
   seteada, **entonces** todos los tests unitarios (repo en memoria) pasan y los `*.pg.test.ts` se saltean
   limpio (no fallan).
10. **Dado** `DATABASE_URL` apuntando a una Postgres local con el esquema migrado, **cuando** se ejecuta
    `npm test`, **entonces** los tests de integración también pasan, y una corrida repetida dos veces
    seguidas da el mismo resultado (evidencia de que el `SAVEPOINT` no deja residuo).
11. **Dado** el repo recién instanciado, **cuando** se abre con Claude Code, **entonces** encuentra
    `CLAUDE.md` en la raíz y a través de él llega a `requirements.md`; **cuando** se abre el mismo repo
    desde GitHub Copilot coding agent (web), **entonces** encuentra `AGENTS.md` (o el `CLAUDE.md` de raíz
    directamente) y llega al mismo `requirements.md` — sin que ningún agente reciba una versión distinta
    o desactualizada de los acuerdos fundamentales.
12. **Dado** el repo recién instanciado, **cuando** se corre `npm test`, **entonces**
    `server/module-boundaries.test.ts` pasa: ningún módulo de dominio importa de otro, y
    `server/platform/` no importa de ningún módulo.
13. **Dado** el repo recién instanciado, **cuando** alguien arranca el spec `002` (la primera feature real
    del proyecto), **entonces** encuentra los 7 templates en `templates/`, copia los que necesita a
    `specs/002-slug/`, y el `tasks.md` resultante tiene `T000` (análisis de consistencia) como primera
    tarea, antes de cualquier tarea de implementación.

## 8. Placeholders del scaffold

Ver tabla completa, cómo se resuelve cada uno (preguntado / derivado / fijo / default con override) y
ejemplo de instanciación en `plan.md` §0. **Sólo `{{PROJECT_NAME}}` se pregunta** — todo lo demás se
resuelve solo. Resumen de los que este documento referencia:

| Placeholder | Qué representa | Cómo se resuelve |
|---|---|---|
| `{{PROJECT_NAME}}` | nombre kebab-case del repo/app nueva | **Se pregunta** |
| `{{PROJECT_NAME_PASCAL}}` / `{{PROJECT_NAME_TITLE}}` | nombre en PascalCase / título legible | Derivado de `{{PROJECT_NAME}}` |
| `{{ALLOWED_EMAIL_DOMAINS}}` | dominios de email permitidos para el login (bootstrap) | Default `['zeetrex.com']`, editable si el proyecto necesita otro |
| `{{EXAMPLE_MODULE_NAME}}` / `{{EXAMPLE_MODULE_NAME_PASCAL}}` / `{{EXAMPLE_ENTITY_TABLE}}` / `{{EXAMPLE_MODULE_PATH}}` | módulo/entidad de ejemplo del ABM genérico | Default `example`; `_PATH` derivado (pluralizado) |
| `{{DATABASE_NAME}}` | nombre de la base Postgres local de desarrollo | Opcional, default derivado de `{{PROJECT_NAME}}` |

Los puertos (`5000` frontend, `3001` backend) ya no son placeholder — son valores fijos en el código
generado, sin necesidad de reservarlos (ver `plan.md` §0, nota sobre puertos).

## 9. Riesgos / decisiones abiertas señaladas para revisión humana

- **Gaps de infraestructura heredados a propósito** (base de test aislada, `server/` fuera del `tsconfig`
  raíz, sin CORS por origen, sin CI de tests) — están documentados en §3 "Excluido" y son decisiones
  explícitas de acotar la v1, no bugs de este scaffold. Resolverlos es un spec de seguimiento, decisión de
  equipo del proyecto instanciado.
- **`GOOGLE_CLIENT_ID`/`AUTH_JWT_SECRET` no son placeholders de instanciación** — son secretos de entorno
  que cada instancia del scaffold genera/obtiene por su cuenta (una consola de identidad OAuth para el
  primero, `openssl rand -hex 32` para el segundo). El scaffold sólo deja el `.env.example` con las claves
  esperadas, nunca un valor real.
- **Los puertos (`5000`/`3001`) son fijos, sin reserva previa** — decisión explícita: el destino de
  producción es serverless (Vercel, donde el puerto no existe como concepto), y una colisión local
  eventual con otro proyecto corriendo al mismo tiempo se resuelve editando un número a mano, no amerita
  una pregunta de instanciación ni una tabla central de reservas.
- **No hay todavía una instanciación real que valide este scaffold de punta a punta.** La sección
  "Aprendizajes de la primera instanciación" en el `README.md` queda vacía hasta que exista una.
- **RF-16 es sin excepciones en esta v1** — no contempla el caso legítimo de que un módulo necesite algo
  de otro módulo de dominio específico (no transversal). Cuando aparezca esa necesidad real, el criterio a
  aplicar (superficie pública explícita por módulo, nunca `ports/domain/infra/api` directo, agregado como
  su propio spec) ya está documentado en `requirements.md` §4.1 (`plan.md` §11.1) — no hace falta
  redecidirlo desde cero en ese momento.
- **RF-16 se verifica con un test que lee imports por texto (regex sobre `import`/`require`), no con el
  compilador de TypeScript.** Es deliberado — no depende de configurar `eslint-plugin-boundaries` ni de
  disciplina de code review, corre con `vitest` como cualquier otro test. Puede tener falsos negativos
  ante un import muy dinámico o reexportado indirectamente; para el tamaño de proyecto que este scaffold
  apunta, el trade-off de simplicidad es intencional.
