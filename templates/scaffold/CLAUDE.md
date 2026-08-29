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
