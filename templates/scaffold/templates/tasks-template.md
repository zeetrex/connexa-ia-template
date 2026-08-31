# Tasks: [Nombre de la feature]

- [ ] **T000** Correr el análisis de consistencia cruzada (equivalente a `/analyze` de spec-kit — ver
  `README.md` §Flujo SDD para el prompt exacto) contra `spec.md`/`plan.md`/`tasks.md` de esta feature y
  `requirements.md`. Incluye chequear solapamiento con specs existentes en `specs/` — ¿algún requisito de
  esta feature ya está cubierto por un módulo de un spec anterior? Si `requirements.md` §2 (revisión de
  solapamiento antes de `specify`) no se hizo o no dejó la decisión registrada en `## Clarifications` de
  `spec.md`, resolverlo acá antes de seguir: módulo nuevo vs. extender uno existente. De sólo lectura, no
  modifica ningún archivo. No seguir a T001 sin este paso hecho y sus hallazgos (si los hubo) resueltos.

## Fase 1 — [nombre]

- [ ] **T001** [Test] ...
- [ ] **T002** (T001) [Implementación] ...

*(TDD, `requirements.md` §3: cada bloque de trabajo intercala una tarea de test antes que su
implementación — nunca todos los tests agrupados al final.)*
