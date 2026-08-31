# {{PROJECT_NAME}}

Instanciado a partir de `connexa-ia-template` (`specs/001-scaffold-inicial/`) — ver ese spec para la
justificación completa de cada decisión de arquitectura. Este README documenta cómo correr y trabajar en
**este** proyecto puntual.

## Qué hay acá

- Frontend: Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (`src/`).
- Backend: Express + TypeScript, arquitectura hexagonal por módulo (`server/modules/<módulo>/{ports,domain,infra,api}` + `server/platform/` transversal).
- Postgres vía `node-pg-migrate`, schema propio `{{DB_SCHEMA}}` (nunca `public`).
- Auth Google OAuth + ABM de usuarios/roles completo, módulo de ejemplo `{{EXAMPLE_MODULE_NAME}}`.
- Ver `requirements.md` para los acuerdos fundamentales (hosting, SDD, TDD, bajo acoplamiento entre
  módulos, branching) y `CLAUDE.md`/`AGENTS.md` para cómo cualquier agente de código debe orientarse en
  este repo.

## Build & run

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, AUTH_JWT_SECRET, GOOGLE_CLIENT_ID
createdb {{DATABASE_NAME}}   # o el mecanismo de Postgres local que uses
npm run migrate
npm run server    # backend en :3001
npm run dev        # frontend en :5000, en otra terminal
npm test            # unitarios siempre; integración si DATABASE_URL está seteada (vía .env)
```

`AUTH_JWT_SECRET` se genera con `openssl rand -hex 32`. `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` salen de
una consola de identidad OAuth de Google (mismo valor en ambas variables).

## Sobre la convención SDD (`spec.md`/`plan.md`/`tasks.md`)

Todo spec nuevo (`002-slug` en adelante) sigue el estándar real de [GitHub spec-kit](https://github.com/github/spec-kit):
`spec.md` sin detalle técnico, `plan.md` sin código completo, `tasks.md` como checklist ejecutable. Los 7
templates viven en `templates/` — copiá el que corresponda a `specs/NNN-slug/`, no arranques en blanco. Ver
`requirements.md` §2.

## Flujo SDD end-to-end, explicado desde cero

**SDD en una frase**: antes de escribir código, se escribe (y se valida con una persona) qué se va a
hacer y por qué, después cómo se va a hacer técnicamente, y recién ahí se rompe en tareas chicas y se
programa.

### Las 7 fases (el proceso)

| Fase | En una frase | ¿Cuándo? | Qué queda escrito |
|---|---|---|---|
| **constitution** | Fijar las reglas que ningún spec puede romper. | Una vez por proyecto. | `requirements.md` (ya generado). |
| **specify** | Escribir QUÉ y POR QUÉ, sin decidir cómo. | Al arrancar una feature. | `spec.md` |
| **clarify** | Resolver dudas y ambigüedades, charlando, antes de diseñar. | Después de `specify`. | Sección `## Clarifications` dentro del propio `spec.md`. |
| **plan** | Decidir CÓMO — arquitectura, modelo de datos, contratos de API. | Después de `specify`. | `plan.md` (+ `research.md`/`data-model.md`/`contracts/`/`quickstart.md` si aplica). |
| **analyze** | Chequear que `spec.md`/`plan.md`/`tasks.md` no se contradigan, antes de tocar código. | Después de `tasks`. | Reporte de sólo lectura, registrado como `T000` en `tasks.md`. |
| **tasks** | Romper el plan en tareas chicas, ordenadas, con dependencias. | Después de `plan`. | `tasks.md` |
| **implement** | Ejecutar las tareas, escribir el código real, correr los tests. | Al final. | El código del proyecto. |

### El prompt de `/analyze`, para copiar y pegar

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
7. Solapamiento con specs existentes — ¿algún requisito de spec.md ya
   está cubierto por un módulo de un spec anterior en specs/? Marcalo
   como hallazgo si hay solapamiento real. Este chequeo es la red de
   seguridad de la revisión obligatoria que ya debería haberse hecho
   antes de escribir spec.md (requirements.md §2) — no la reemplaza.

Devolvé una tabla (ID, categoría, severidad, dónde, resumen,
recomendación) y un resumen de cobertura requisito↔tarea. No modifiques
ningún archivo — sólo el reporte.
```

Registrá el resultado (aunque sea "sin hallazgos") como `T000` en `tasks.md` antes de marcar T001 como
empezada.

## Bajo acoplamiento entre módulos

`server/module-boundaries.test.ts` corre en cada `npm test` y falla si algún módulo importa código de
aplicación de otro módulo de dominio, o si `server/platform/` importa de un módulo. Ver `requirements.md`
§4 para la regla completa y §4.1 para el criterio a aplicar el día que un módulo necesite otro de verdad.

## Aprendizajes de esta instanciación

Ver el resumen de validación en `specs/001-scaffold-inicial/tasks.md` (estado real de cada tarea al cierre
de esta instanciación).
