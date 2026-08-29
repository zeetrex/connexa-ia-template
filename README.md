# connexa-ia-template

Scaffold genérico, en formato Spec-Driven Development (SDD), para arrancar una **app full-stack nueva**
con arquitectura vertical-hexagonal por módulo: Vite + React + Express + TypeScript + Postgres, backend
organizado en módulos autocontenidos (`ports/domain/infra/api`), con bajo acoplamiento y dirección de
dependencias entre módulos verificados por código, no sólo por convención escrita.

**Este repo no es una app.** No compila, no corre, no tiene código TS/React real. Es una especificación —
documentos que describen exactamente qué generar y cómo. El código real se genera **instanciando** este
spec con los valores de un proyecto concreto, en un repo nuevo.

Es autocontenido: no requiere conocer ningún otro proyecto para entenderse ni para instanciarse. Toda
decisión de diseño está justificada en `spec.md`/`plan.md` por su mérito técnico — se puede llevar a
cualquier entorno y usarlo sin contexto adicional.

## Qué hay acá

```
connexa-ia-template/
├── README.md                                  ← este archivo
└── specs/001-scaffold-inicial/
    ├── spec.md                                 ← QUÉ y POR QUÉ (requisitos, alcance, criterios de aceptación)
    ├── plan.md                                 ← CÓMO (arquitectura, código completo capa por capa, convenciones)
    └── tasks.md                                ← checklist ejecutable, con IDs y dependencias entre tareas
```

## Sobre la convención SDD (`spec.md`/`plan.md`/`tasks.md`)

Esta convención está tomada de [GitHub spec-kit](https://github.com/github/spec-kit) — el framework que la
popularizó — no inventada para este proyecto. En su forma estándar: `spec.md` fija QUÉ y POR QUÉ
(requisitos, historias de usuario, criterios de aceptación, sin detalle técnico); `plan.md` fija las
decisiones técnicas (arquitectura, modelo de datos, contratos de API, estructura de proyecto) — **sin
código fuente completo**, remitiendo si hace falta a artefactos de diseño separados (`data-model.md`,
`contracts/`); y `tasks.md` rompe esas decisiones en tareas ejecutables, que es donde recién se escribe el
código real, tarea por tarea.

**El `plan.md` de `001-scaffold-inicial` (el único spec de este repo) es una excepción deliberada a esa
convención** — trae código fuente completo, capa por capa, en vez de sólo decisiones. El motivo: este spec
no describe una feature con criterio de diseño para ejercer durante la ejecución — describe un scaffold,
cuyo objetivo es reproducirse exactamente igual en cada instanciación. El código *es* la decisión; no hay
margen que dejarle al agente ejecutor. Esta excepción está acotada a este spec — `requirements.md` §2 deja
asentado que **todo spec posterior, en el proyecto que resulte de instanciar este scaffold, sigue el
estándar real de spec-kit**, sin código embebido en `plan.md`.

Referencias:
- [github/spec-kit](https://github.com/github/spec-kit) — repositorio y CLI.
- [spec-driven.md](https://github.com/github/spec-kit/blob/main/spec-driven.md) — la metodología completa.
- [templates/plan-template.md](https://github.com/github/spec-kit/blob/main/templates/plan-template.md) — la plantilla real de `plan.md`.

## Flujo SDD end-to-end, explicado desde cero

Esta sección no asume que sepas qué es SDD. Está para alguien que nunca lo vio y necesita entender, en 5
minutos, qué se hace y por qué — antes de tocar el proceso real en el proyecto que resulte de instanciar
este scaffold.

**SDD en una frase**: antes de escribir código, se escribe (y se valida con una persona) qué se va a
hacer y por qué, después cómo se va a hacer técnicamente, y recién ahí se rompe en tareas chicas y se
programa. El objetivo es que el código nunca diverja en silencio de lo que se decidió, y que quede un
rastro escrito de esas decisiones — para el próximo que abra el proyecto, humano o agente de código.

No es una convención inventada acá: es la que popularizó [GitHub spec-kit](https://github.com/github/spec-kit).
Esta sección resume su proceso de 7 fases y sus 7 documentos, sin la CLI (ver más abajo por qué no hace
falta instalarla).

### Las 7 fases (el proceso)

| Fase | En una frase | ¿Cuándo? | Qué queda escrito |
|---|---|---|---|
| **constitution** | Fijar las reglas que ningún spec puede romper. | Una vez por proyecto, no por feature. | `requirements.md` (ya generado por este scaffold). |
| **specify** | Escribir QUÉ se va a hacer y POR QUÉ — sin decidir todavía cómo. | Al arrancar una feature. | `spec.md` |
| **clarify** | Resolver las dudas y ambigüedades del spec, charlando, antes de diseñar. | Después de `specify`, antes de `plan`. | Sección `## Clarifications` dentro del propio `spec.md` — no es un archivo aparte. |
| **plan** | Decidir CÓMO — arquitectura, modelo de datos, contratos de API. | Después de que el spec está claro. | `plan.md` (+ `research.md`/`data-model.md`/`contracts/`/`quickstart.md` si la feature lo amerita). |
| **analyze** | Chequear que `spec.md`/`plan.md`/`tasks.md` no se contradigan entre sí, antes de tocar código. | Después de `tasks`, antes de la primera tarea de implementación. | Un reporte (sólo lectura) — su ejecución queda registrada como `T000` en `tasks.md`. |
| **tasks** | Romper el plan en tareas chicas, ordenadas, con dependencias. | Después de `plan`. | `tasks.md` |
| **implement** | Ejecutar las tareas, escribir el código real, correr los tests. | Al final, tarea por tarea. | El código del proyecto. |

### Los 7 archivos (el resultado)

| Archivo | Para qué sirve, en una línea | ¿Siempre o sólo a veces? |
|---|---|---|
| `spec.md` | QUÉ y POR QUÉ — requisitos, para quién, cuándo se considera terminado. Cero detalle técnico. | **Siempre.** |
| `plan.md` | CÓMO técnico — arquitectura, decisiones, qué archivos toca. Sin código completo. | **Siempre.** |
| `tasks.md` | La lista de tareas concretas, en orden, con qué depende de qué. Acá sí se escribe código, tarea por tarea. | **Siempre.** |
| `research.md` | Si hubo una duda técnica ("¿qué librería uso?", "¿qué enfoque?"), acá queda la decisión y por qué se descartaron las otras opciones. | Sólo si `plan.md` tiene una incógnita técnica sin resolver. |
| `data-model.md` | Las entidades nuevas o que cambian — sus campos, relaciones, reglas — sin el código que las implementa. | Sólo si la feature agrega o cambia entidades. |
| `contracts/` | Qué endpoints expone la feature — request, response, errores — sin el código del `Router`. | Sólo si la feature agrega o cambia endpoints. |
| `quickstart.md` | Una guía corta, a mano, para comprobar que la feature funciona de punta a punta. Sin código de implementación. | Opcional — útil cuando el flujo de verificación no es obvio. |

Los templates de los 7 (`templates/spec-template.md`, etc.) ya están generados en la raíz del proyecto
instanciado — copiá el que corresponda a `specs/NNN-slug/` y completalo, no arranques en blanco.

### Ejemplo chico, de punta a punta

Supongamos que el proyecto instanciado necesita agregar prioridad a las tareas del módulo de ejemplo:

1. **specify** → `specs/002-prioridad-de-tareas/spec.md`: "como usuario quiero marcar una tarea como
   urgente, para que aparezca primero en la lista" + criterios de aceptación. Nada de columnas de tabla ni
   de código todavía.
2. **clarify** → en el chat: "¿prioridad es un enum fijo o un número libre?" → se decide enum
   (`low`/`normal`/`high`) → queda anotado en `## Clarifications` dentro del mismo `spec.md`.
3. **plan** → `specs/002-prioridad-de-tareas/plan.md`: decide agregar una columna `priority` a la tabla
   existente, sin librerías nuevas — no hace falta `research.md`. Si el enum fuera una entidad más compleja
   se separaría en `data-model.md`; acá no amerita.
4. **analyze** → se corre el prompt de abajo contra los 3 documentos — sin hallazgos, se anota en `T000`.
5. **tasks** → `specs/002-prioridad-de-tareas/tasks.md`: T001 test de que ordena por prioridad (falla),
   T002 la implementación (lo hace pasar), T003 la migración, etc.
6. **implement** → se ejecutan T001, T002, T003... en orden, con tests corriendo en verde en cada paso.

### El prompt de `/analyze`, para copiar y pegar

No hace falta la CLI de spec-kit — es texto plano que cualquier agente (Claude Code, GitHub Copilot coding
agent, Codex, u otro) puede seguir con sólo leerlo. Antes de arrancar la implementación de cualquier spec
posterior a `001`:

```
Leé specs/<NNN-slug>/spec.md, plan.md y tasks.md de esta feature, y
requirements.md como constitución del proyecto. Chequeá:

1. Duplicación — requisitos casi idénticos, frases redundantes.
2. Ambigüedad — descripciones vagas sin criterio medible, placeholders
   sin resolver.
3. Subespecificación — requisitos sin objeto ni resultado claro, tareas
   que referencian algo no definido en plan.md.
4. Violación de requirements.md — cualquier conflicto con sus reglas,
   marcalo como CRÍTICO.
5. Huecos de cobertura — requisitos de spec.md sin ninguna tarea
   asociada en tasks.md, o tareas que no corresponden a ningún requisito.
6. Inconsistencia — términos que cambian de nombre entre los tres
   documentos, entidades de datos contradictorias.

Devolvé una tabla (ID, categoría, severidad, dónde, resumen,
recomendación) y un resumen de cobertura requisito↔tarea. No modifiques
ningún archivo — sólo el reporte.
```

Registrá el resultado (aunque sea "sin hallazgos") como `T000` en `tasks.md` antes de marcar T001 como
empezada.

## Alcance de esta primera iteración

- ✅ App full-stack completa: Vite + React 18 + TS + Tailwind/shadcn (frontend), Express + TS (backend),
  Postgres vía `node-pg-migrate`.
- ✅ Patrón de capas completo: `server/modules/<módulo>/{ports,domain,infra,api}` +
  `server/platform/{config,db,http}` transversal — arquitectura hexagonal (Ports & Adapters) aplicada por
  módulo vertical.
- ✅ **Bajo acoplamiento y dirección de dependencias entre módulos, verificados por un test automático** (`server/module-boundaries.test.ts`)
  que falla el build si algún módulo importa código de aplicación de otro módulo de dominio, o si
  `server/platform/` depende hacia atrás de un módulo — no una convención que dependa de disciplina de
  code review.
- ✅ **Auth + ABM completo desde el día uno** (login, sesión JWT, permisos, ABM de usuarios y roles), con
  la verificación de sesión (`platform/http/session.ts`) separada de la emisión (módulo `auth`) para que
  la capa transversal nunca dependa de un módulo de dominio.
- ✅ Un módulo de ejemplo genérico adicional, con persistencia real (no mock), que demuestra el patrón
  aplicado a una entidad de dominio simple sin ninguna dependencia del módulo de auth.
- ✅ Tests unitarios (repos en memoria) e integración (Postgres real, arnés `SAVEPOINT` desde el día uno).
- ✅ **Memoria inicial del proyecto pensada para múltiples agentes de código** — `CLAUDE.md` + `AGENTS.md`
  + `requirements.md`, para que el mismo conjunto de acuerdos (hosting, SDD, TDD, arquitectura,
  bajo acoplamiento entre módulos, Gitflow) lo lean tanto Claude Code como GitHub Copilot coding agent (u
  otro), sin duplicar contenido. Ver `spec.md` RF-14/RF-15/RF-16 y `plan.md` §11.
- ✅ **Templates de los 7 artefactos de SDD + análisis de consistencia obligatorio** (`templates/`,
  `T000` en `tasks.md`) — para que la regla de seguir el estándar real de spec-kit desde el spec `002`
  tenga un esqueleto concreto, no sólo prosa. Ver `spec.md` RF-17/RF-18 y `plan.md` §11.4.
- ❌ **Base de test Postgres aislada** — decisión explícita de acotar la v1, documentada como deuda
  técnica conocida, no resuelta acá.
- ❌ **`server/` bajo el `tsconfig.json` raíz / CORS por origen / CI corriendo tests** — mismos gaps,
  mismo motivo: mantener acotado el alcance de la primera iteración.

Ver `spec.md` §3 para el detalle completo de qué queda afuera y por qué.

## Tests de integración: limitación real en GitHub Copilot coding agent

Los tests de integración (`*.pg.test.ts`) sólo corren si hay una Postgres real alcanzable en
`DATABASE_URL` — si no la hay, se saltean limpio (`describe.skipIf(!HAS_DB)`, RF-12), nunca fallan por su
ausencia. En una workstation (Claude Code u otro agente con shell real) esto no es problema: quien
instancia levanta su propia Postgres local (Docker, nativo, lo que sea) y listo.

**En GitHub Copilot coding agent es distinto, y vale la pena saberlo antes de asumir que "ya va a andar".**
Ese agente corre en un entorno efímero sobre GitHub Actions — no tiene una forma documentada de levantar
un contenedor por su cuenta durante la sesión (no hay `docker run` libre disponible para el agente). La
única vía soportada por GitHub para tener Postgres ahí es declararlo **de antemano**, como *service
container* de GitHub Actions, en `.github/workflows/copilot-setup-steps.yml` — un archivo que GitHub
ejecuta *antes* de que el agente empiece a trabajar, no algo que el agente arme solo.

Contenido que tendría que tener ese archivo (no generado por este scaffold todavía, queda documentado acá
para cuando haga falta probarlo):

```yaml
name: "Copilot Setup Steps"

on:
  workflow_dispatch:
  push:
    paths:
      - .github/workflows/copilot-setup-steps.yml
  pull_request:
    paths:
      - .github/workflows/copilot-setup-steps.yml

jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest

    permissions:
      contents: read

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: {{DATABASE_NAME}}
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run migrate
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/{{DATABASE_NAME}}
          DATABASE_SSL: disable
```

**Esto no es garantía de que vaya a funcionar — hace falta probarlo contra un repo real con Copilot coding
agent habilitado.** Lo que se pudo verificar contra la documentación oficial: `copilot-setup-steps.yml`
sólo puede personalizar `steps`/`permissions`/`runs-on`/`services`/`timeout-minutes` del job (cualquier
otra cosa se ignora), y `services` es el mecanismo real de GitHub Actions para declarar un contenedor
Postgres corriendo en paralelo. Lo que **no** se pudo confirmar contra la documentación: si ese contenedor
sigue vivo y alcanzable durante la sesión de trabajo del agente después de que termina el job de setup, o
sólo durante el job mismo — es la duda real que queda pendiente de validar a mano.

## Cómo instanciar un proyecto nuevo

Generar el código ya no es un paso que un agente ejecuta leyendo `plan.md` y retipeando ~40 archivos — es
`node scripts/instantiate.mjs <nombre-proyecto>`, determinístico: copia `templates/scaffold/` y sustituye
los placeholders de `plan.md` §0, sin margen de variación entre corridas de agentes distintos en momentos
distintos. El script falla fuerte (exit code ≠ 0, listando cada archivo y token) si queda algún `{{...}}`
sin resolver — no puede terminar "casi bien".

Lo que sigue siendo trabajo real, con criterio de un agente o de una persona, es la validación posterior.
Tampoco hace falta pausar antes de `npm run migrate` contra una Postgres real: al ser un schema propio
(`{{DB_SCHEMA}}`) de un proyecto recién creado, sin datos existentes en riesgo, correrlo es tan reversible
como borrar ese schema — no es la misma situación que migrar una base compartida con datos reales, que sí
amerita cuidado (`requirements.md` §1). Si no hay Postgres alcanzable (el caso esperable en GitHub Copilot
coding agent sin el setup de la sección anterior), esas tareas quedan marcadas como pendientes en
`tasks.md` — no es un bloqueo, es el resultado normal a reportar, mismo criterio que ya usan los tests
(`describe.skipIf(!HAS_DB)`).

Prompt para pasarle a un agente (Claude Code, GitHub Copilot coding agent, u otro) que tenga acceso a este
scaffold. Reemplazá `<nombre-proyecto-kebab-case>` por el nombre real una sola vez, en el segundo párrafo
— el resto del prompt lo referencia por `{{PROJECT_NAME}}`, no hace falta repetirlo en ningún otro lado.

```
Usá connexa-ia-template para instanciar un proyecto nuevo.

Nombre del proyecto ({{PROJECT_NAME}}, kebab-case, fijo — no me
preguntes por él): <nombre-proyecto-kebab-case>

Todo lo demás (catálogo completo en plan.md §0) se resuelve solo a
partir de ese nombre: {{PROJECT_NAME_PASCAL}}/{{PROJECT_NAME_TITLE}}/
{{DB_SCHEMA}}/{{DATABASE_NAME}} derivados; puertos fijos (5000/3001, no
placeholder); ALLOWED_EMAIL_DOMAINS con default ['zeetrex.com'] (se pisa
con --allowed-domains si el proyecto necesita otro dominio); módulo de
ejemplo con default "example" (se pisa con --example-module si me decís
la entidad real del proyecto ahora).

1. Corré `node scripts/instantiate.mjs {{PROJECT_NAME}}` — genera el
   proyecto completo (código + specs/001-scaffold-inicial/{spec,plan,
   tasks}.md, CLAUDE.md/AGENTS.md/requirements.md, templates/) en un
   directorio nuevo, con los placeholders resueltos. Confirmá que
   terminó sin reportar ningún placeholder pendiente, y que
   requirements.md incluye íntegra la sección de bajo acoplamiento y
   dirección de dependencias entre módulos (§4).
2. Corré npm install + npm test y confirmá que los tests unitarios pasan
   sin necesidad de Postgres, incluido module-boundaries.test.ts —
   verificá que ese test realmente detecta una violación real, no sólo
   que corre.
3. Verificá si hay una Postgres alcanzable (Node 20+, DATABASE_URL
   resuelve). Si la hay: migrá, levantá el server, y validá a mano el
   ciclo completo de auth (bootstrap, segundo usuario inactivo, ABM de
   roles con protección/conflicto) y del módulo de ejemplo — sin pausar
   a preguntarme, es un schema propio de un proyecto recién creado, sin
   nada en riesgo. Si no la hay: no lo intentes, marcá esas tareas como
   pendientes por ausencia de Postgres y seguí con el resto.
4. Si encontrás algún bug real en el camino (con o sin Postgres),
   corregilo en el código generado y avisame — yo le paso el reporte al
   administrador de connexa-ia-template. No corrijas vos
   connexa-ia-template (specs/001-scaffold-inicial/{spec,plan,tasks}.md
   ni templates/scaffold/, la fuente) — es una decisión que reviso yo
   antes de que se propague a la próxima instanciación.
5. Marcá tasks.md con el resultado real de cada tarea (no asumas nada
   como hecho sin haberlo corrido; lo que quedó pendiente por falta de
   Postgres, marcalo como tal, no como hecho) y dejame un resumen de qué
   quedó validado y qué sigue pendiente.

No hagas commit de nada — dejalo en el working tree para que lo revise
antes.
```

## Compatibilidad multi-agente

Este scaffold está pensado para que lo instancien y ejecuten personas distintas desde herramientas
distintas — no sólo Claude Code. Por eso el prompt de instanciación genera siempre `CLAUDE.md` +
`AGENTS.md` + `requirements.md` en el proyecto resultante (`plan.md` §11):

- **Claude Code** lee `CLAUDE.md` garantizado.
- **GitHub Copilot coding agent** (web) lee `AGENTS.md` (el más cercano en el árbol), y también soporta un
  `CLAUDE.md` de raíz directamente — confirmado contra la documentación oficial de GitHub, 2026-08-27.
- Ambos terminan leyendo el mismo `requirements.md` — la única fuente de los acuerdos fundamentales
  (hosting, SDD, TDD, arquitectura, bajo acoplamiento entre módulos, Gitflow), sin que ningún agente reciba
  una versión distinta.

## Por qué el bajo acoplamiento entre módulos es la regla central de este scaffold

Organizar el backend en módulos verticales da la *forma* de un sistema desacoplado, pero no la garantiza
por sí sola — es la única regla de `requirements.md` cuyo incumplimiento ningún test unitario de un módulo
detecta por sí solo. Explicación completa, con los dos casos reales que la sostienen (`Transaction`,
verificación de sesión): `plan.md` §4. Regla en sí: `spec.md` §1 y RF-16.

## Specs de seguimiento (para cuando haga falta ampliar)

Este scaffold arranca acotado a propósito. Cuando el proyecto instanciado necesite algo que quedó afuera,
se pide como un spec nuevo, numerado, dentro del mismo repo (`specs/002-...`, `specs/003-...`) — no se
reescribe el spec `001`. Ejemplos típicos:

- **Base de test Postgres aislada** — `globalSetup` de Vitest + base dedicada, en vez de la base de
  desarrollo compartida.
- **CORS por origen y hardening adicional**.
- **Refresh de sesión** — para achicar la ventana de 8hs en la que activar/desactivar un usuario no surte
  efecto hasta el próximo login.
- **Módulos de dominio reales adicionales**, más allá del ejemplo genérico — siguiendo el mismo patrón de
  capas, con TDD desde el primer requisito y verificados por `module-boundaries.test.ts` como cualquier
  otro módulo.

## Aprendizajes de la primera instanciación real

Primera instanciación real: `connexa-ia-test`, 2026-08-28, contra una Postgres 16 local (Docker). Resultado
general: el scaffold se instanció y validó de punta a punta sin necesidad de inventar decisiones de diseño
— todo lo que hacía falta estaba resuelto en `spec.md`/`plan.md`. Un solo bug real de código encontrado,
ya corregido acá.

- **Bug real en `plan.md` §10.4, ya corregido**: `src/App.tsx` tipaba `children` de `AuthGate` como
  requerido (`{ children: React.ReactNode }`), pero el propio `plan.md` lo usa con sólo un comentario JSX
  adentro (el placeholder de rutas/nav real) — que no cuenta como children en tiempo de compilación. El
  build normal (`npm run build`, que usa `tsc -b --noCheck`) no lo detecta; sólo lo encuentra `npx tsc
  --noEmit` (el chequeo estricto que T065 pide correr aparte, justamente para esto). Corregido a
  `children?: React.ReactNode` en `plan.md` §10.4 — cualquier instanciación a partir de esta versión ya
  sale sin el bug.
- **T045–T049 (verificación HTTP) con matiz**: `npm run server` y el ciclo completo de `/api/admin/roles`
  y `/api/{{EXAMPLE_MODULE_PATH}}` se pudieron verificar de punta a punta por HTTP real generando un token
  de sesión válido a mano con `signSession()` (la misma función que usa el login real) en vez de esperar
  credenciales OAuth de Google. Lo único que **no** se pudo ejercitar por HTTP real fue la llamada a
  `googleClient.verifyIdToken()` en sí (`POST /api/auth/google`) — verifica la firma contra los servidores
  reales de Google, no falsificable con `jsonwebtoken` suelto ni con un token armado a mano. La lógica de
  bootstrap que ese endpoint invoca (primer usuario → `active` + `Admin`, siguientes → inactivos) sí quedó
  cubierta, tanto por los tests de integración (`login.pg.test.ts`) como por una ejecución manual directa
  de los mismos repositorios contra Postgres real. Si en algún momento se quiere cerrar ese último gap sin
  depender de credenciales reales, la opción es agregar un modo de test que inyecte un
  `OAuth2Client`/verificador falso — no incluido en esta v1, candidato a spec de seguimiento si hace
  falta un día.
- **Contenedor Postgres reusado entre instanciaciones**: al reusar un contenedor Docker de una
  instanciación anterior (mismo nombre, mismo `POSTGRES_DB`), `npm run migrate` respondió "No migrations
  to run!" — confirma que las migraciones son idempotentes como se documentaba, pero también dejó datos de
  prueba de la corrida anterior (usuarios, un rol extra) en las tablas. Antes de verificar el criterio de
  aceptación 3 de `spec.md` ("primer usuario de una base vacía") hubo que limpiar esas tablas a mano
  (`TRUNCATE app_user CASCADE` + borrar roles no protegidos). No es un bug del scaffold — es una
  consecuencia esperable de reusar infraestructura entre corridas de verificación manual, documentada acá
  para la próxima vez.
- **Todo lo demás salió tal cual documentado, sin ambigüedad**: los 7 archivos de bootstrap del §12
  (`src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`, `tsconfig.json` frontend, `vite.config.ts`,
  `index.html`, `.gitignore`) ya estaban completos en `plan.md` — nada que inventar. Los 7 primitivos de
  shadcn/ui (§10.1) se escribieron a mano siguiendo el código fuente público de la librería, como indica
  el propio `plan.md` para el caso "agente sin humano contestando el wizard" — funciona igual que el
  resultado de `npx shadcn@latest add`. El catálogo de 11 permisos (7 de auth + 4 del módulo de ejemplo) y
  los 14 tests automáticos (9 unitarios + 5 de integración, dos corridas seguidas sin residuo de
  `SAVEPOINT`) coincidieron exactamente con lo que `tasks.md` esperaba.
