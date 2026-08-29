# Plan técnico: [Nombre de la feature]

## 1. Resumen

[2-3 oraciones: el enfoque técnico elegido.]

## 2. Contexto técnico

- Lenguaje/versión, dependencias nuevas si las hay, storage, testing, plataforma.
- `[NEEDS CLARIFICATION: ...]` para cualquier incógnita técnica sin resolver — no adivinar; se resuelve
  en `research.md` antes de seguir.

## 3. Chequeo contra `requirements.md` (Constitution Check)

Un checkbox por sección — no alcanza con "revisé el documento": cada una se confirma por separado, y
cualquier incumplimiento se declara acá como excepción explícita, nunca se omite en silencio.

- [ ] §1 Hosting y deploy — si la feature agrega env vars nuevas: clasificadas correctamente (server-only
  → **Secret**; con prefijo `VITE_` → **Config**, porque termina en el bundle igual). Si agrega una
  migración: corre en el build (`vercel-build`), nunca asumida en cold start.
- [ ] §4 Bajo acoplamiento y dirección de dependencias entre módulos — sin imports cruzados salvo hacia
  `platform/` o `modules/<x>/public.ts` explícito (§4.1).
- [ ] §5 Arquitectura backend — si la feature agrega/toca un módulo: `ports/domain/infra/api`, `tx:
  Transaction` en cada método de repo, doble implementación pg + in-memory por puerto, migración con
  bloques Up/Down explícitos.
- [ ] §5.1 Sistema de diseño de frontend — si la feature agrega/modifica una vista: componentes reales de
  shadcn/ui (nunca hand-rolled sin justificar), `Card`+`Table`, `Switch`/`Badge` donde corresponda, íconos
  `lucide-react` en botones de acción, `Dialog` que persiste sólo en "Guardar", gateo por
  `hasPermission()`, columnas de acción alineadas a la derecha, tokens de marca (nunca color hardcodeado),
  pantalla para todo permiso nuevo salvo excepción declarada, **manejo de errores (`onError`/`toast`/
  `ErrorDebugDialog`) nombrado explícitamente — "mismo patrón que [otra vista]" no alcanza para cubrirlo**.
- [ ] §6 Branching model — se desarrolla en `feature/NNN-slug`, PR contra `develop`; nunca commit directo
  a `main`/`develop`.
- [ ] §7 Convenciones técnicas — IDs `BIGSERIAL`, schema propio (nunca `public`), inglés en código,
  catálogo de permisos plano, Zod en cada ruta, errores de dominio como clases, tests con arnés
  `SAVEPOINT` si hay Postgres disponible.
- [ ] TDD (§3) — `tasks.md` va a intercalar tarea de test antes que su implementación, no agruparlas al
  final.
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
