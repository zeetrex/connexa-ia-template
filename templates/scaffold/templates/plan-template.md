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
