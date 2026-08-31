# requirements.md — Acuerdos fundamentales de {{PROJECT_NAME_TITLE}}

Fuente de verdad para cualquier agente de código (Claude Code, GitHub Copilot coding agent, u otro) que
trabaje en este repo. Todo spec nuevo (`specs/NNN-slug/`) debe ser consistente con lo que está acá — si
algo lo contradice, se discute con el equipo y se actualiza este documento primero, nunca se lo ignora en
silencio ni se lo contradice en un spec sin dejarlo dicho.

## 1. Hosting y deploy

- Vercel, build desde `main`. El script `vercel-build` corre en este orden:
  `typecheck:server && npm run migrate && npm run build` — el esquema se aplica ANTES del build del
  bundle, y todo el build falla cerrado si el typecheck o la migración fallan.
- Las migraciones corren en el build, nunca en el cold start del proceso.
- Env vars server-only (`DATABASE_URL`, `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_ID`) como **Secret**. Cualquier
  var con prefijo `VITE_` termina en el bundle del navegador igual (Vite la inyecta en build time) — va
  como **Config**, nunca Secret.
- Previews (build o no de ramas que no son `main`): [decisión del proyecto — documentar acá cuál se tomó].

## 2. SDD obligatorio para toda feature nueva

- Todo feature/fix no trivial se planifica antes de escribir código: `specs/NNN-slug/{spec.md,plan.md,tasks.md}`.
- **Revisión de solapamiento con specs existentes, obligatoria antes de `specify`**: antes de crear
  `specs/NNN-slug/spec.md` para un feature nuevo, el agente lee `spec.md` (y `plan.md` si hace falta) de
  todos los specs ya existentes en `specs/` para detectar si el requisito ya es competencia de un módulo
  existente (misma entidad/dominio/caso de uso — no sólo nombre parecido). Si encuentra solapamiento real,
  no arranca el spec nuevo en silencio: se lo muestra al usuario (qué spec/módulo existente, por qué) y le
  pregunta explícitamente si quiere un módulo nuevo independiente o extender el módulo existente. La
  decisión (y el motivo) queda registrada en `spec.md`, en la sección `## Clarifications` (mismo formato
  `Q: ... → A: ...` que ya usa la fase `clarify` — ver `templates/spec-template.md`). Si la resolución es
  extender un módulo existente, no se crea un módulo nuevo en `server/modules/` — el spec nuevo referencia
  al que extiende (`specs/00X-slug` extiende `specs/00Y-slug`) en vez de duplicar lógica de negocio. El
  paso `analyze` (T000, más abajo) actúa como red de seguridad si este chequeo se saltea — no lo reemplaza.
- Convención tomada de [GitHub spec-kit](https://github.com/github/spec-kit) — no inventada para este
  proyecto. `spec.md` = QUÉ y POR QUÉ (requisitos, historias de usuario, criterios de aceptación, sin
  detalle técnico). `plan.md` = decisiones técnicas — arquitectura, modelo de datos, contratos de API,
  estructura de proyecto — **no código fuente completo**; para una feature con superficie grande, separar
  el detalle en artefactos propios (`data-model.md`, `contracts/`) en vez de inflar `plan.md`. `tasks.md`
  = checklist ejecutable con IDs y dependencias — el código real se escribe ahí, tarea por tarea, no antes.
- **Templates para los 7 artefactos** (`spec.md`/`plan.md`/`tasks.md` obligatorios;
  `research.md`/`data-model.md`/`contracts/`/`quickstart.md` opcionales, según lo que la feature necesite)
  viven en `templates/` en la raíz de este repo — ver `plan.md` §11.4 del scaffold que lo generó para el
  contenido completo, y `README.md` §"Flujo SDD end-to-end" para una explicación sin jerga de qué es cada
  uno.
- **Análisis de consistencia cruzada obligatorio antes de implementar** (equivalente a `/analyze` de
  spec-kit): antes de arrancar la Fase 1 de `tasks.md` (T001 en adelante), corré el prompt de análisis
  documentado en `README.md` contra `spec.md`/`plan.md`/`tasks.md` de la feature y `requirements.md`. Es
  de sólo lectura — nunca modifica archivos, sólo devuelve un reporte de duplicación, ambigüedad,
  subespecificación, violación de este documento, requisitos sin tarea asociada, e inconsistencia
  terminológica. El resultado (aunque sea "sin hallazgos") queda registrado como **T000** en `tasks.md` —
  ver `templates/tasks-template.md`. Ningún spec pasa a implementación sin este paso hecho.
- **Excepción, ya cerrada, que no sienta precedente**: el scaffold original (`connexa-ia-template`, spec
  `001-scaffold-inicial`) generó este proyecto a partir de un árbol de archivos literal
  (`templates/scaffold/`), no de código embebido en un `plan.md` — el objetivo era que se reproduzca
  exactamente igual en cada instanciación, sin margen de diseño para el agente ejecutor. Ningún spec
  posterior a `001` repite ese patrón — desde `002` en adelante, `plan.md` sigue el estándar real de
  spec-kit descripto arriba.
- Nada de código sin spec validado por un humano primero.
- Los specs quedan numerados secuencialmente y nunca se reescriben retroactivamente — una corrección a un
  spec ya cerrado es un spec nuevo que lo referencia, no una edición silenciosa del viejo.
- Idioma: identificadores técnicos (funciones, variables, nombres de test) en inglés; los documentos de
  spec en español — salvo que el equipo decida lo contrario para este proyecto puntual.

## 3. TDD como estándar

- Desde el primer spec de feature real (no `001-scaffold-inicial`, que no tenía nada previo contra qué
  testear), todo requisito funcional se implementa test-first: test que falla → código mínimo que lo pasa
  → refactor. `tasks.md` intercala explícitamente tarea de test y tarea de implementación, no las agrupa al
  final.
- **Alcance real de "todo requisito funcional"**: aplica a lógica de dominio y de repositorio (`domain/`,
  `infra/*.repository.*.ts`) — ahí es donde vive el riesgo real (duplicados, validaciones, traducción de
  errores) y donde este scaffold siempre tuvo test-first, desde `auth`/`example` en adelante. **Las rutas
  HTTP** (`api/*.routes.ts`) son deliberadamente la excepción: son una capa delgada (Zod + delegar al
  dominio + traducir el resultado a status HTTP) que se valida a mano una vez (`curl`/HTTP real, dejado
  como evidencia en `tasks.md`), no con un test automatizado — así viene funcionando en todo el scaffold,
  nunca hubo un test de rutas en ningún módulo. No es una omisión sin decir: es la convención real del
  proyecto, y esta línea es la que la deja escrita en vez de asumida.
- **Si una feature necesita más que eso** (una ruta con lógica propia no delegable, o el equipo decide que
  vale la pena empezar a cubrir HTTP con tests), el spec lo declara explícitamente en su `plan.md` y suma
  `supertest` contra el `app` de Express ya exportado sin `.listen()` (`server/index.ts`) — pero es una
  decisión puntual de ese spec, no algo que se infiere en silencio ni que obliga a retrofitear los módulos
  ya cerrados. Si en algún momento el equipo decide adoptarlo como convención general (no sólo para una
  feature puntual), esa decisión se toma acá, en este documento — no se cuela como efecto colateral de un
  spec individual.

## 4. Bajo acoplamiento y dirección de dependencias entre módulos — no negociable

Dos principios de diseño de paquetes con nombre propio, no una regla inventada para este proyecto: **bajo
acoplamiento** y **dirección de dependencias hacia la capa estable** (*Stable Dependencies Principle*).

- **Regla de acoplamiento**: ningún módulo (`server/modules/<x>/{ports,domain,infra,api}`) importa un
  archivo de `ports/domain/infra/api` de otro módulo de dominio.
- **Regla de dirección**: `server/platform/` — la capa más estable del sistema, la que menos cambia —
  nunca importa de ningún módulo de dominio. La dependencia sólo va de un módulo hacia `platform/`, nunca
  al revés. Única excepción: `server/index.ts`, la raíz de composición, que conoce todos los módulos para
  montarlos.
- Más estricto que el *Acyclic Dependencies Principle* clásico: no alcanza con prohibir ciclos, se
  prohíbe directamente cualquier dependencia módulo→módulo — el objetivo es que cada módulo sea extraíble
  solo, no sólo que el grafo no tenga vueltas.
- **Por qué es no negociable**: es la única regla de esta lista cuya violación no la detecta ningún test
  unitario del módulo afectado — todo sigue compilando y pasando tests, y el síntoma real (un módulo que
  debería poder aislarse y en realidad no puede) sólo aparece el día que alguien intenta extraerlo,
  cuando ya es una refactorización cara en vez de un chequeo de 10 líneas.
- **Antes de poner algo en `domain/` o `infra/` de un módulo**, preguntar: "¿esto lo va a necesitar sólo
  este módulo, o cualquier módulo futuro?". Si la respuesta es "cualquiera", va en `platform/`, aunque hoy
  sólo lo use uno.
- **Verificación**: `server/module-boundaries.test.ts` (parte del scaffold, ver `plan.md` §13.3) lee los
  imports de cada archivo fuente y falla el build ante cualquier violación. Correr `npm test` antes de dar
  por cerrado cualquier spec que agregue o modifique un módulo.
- Extender el catálogo compartido de permisos (`permission`/`role`/`role_permission`, tablas) vía
  migraciones no viola esta regla — es infraestructura de datos compartida por diseño, la regla es sobre
  código de aplicación.

### 4.1. Cuándo un módulo necesita otro, de verdad

La regla de arriba es deliberadamente sin excepciones en la v1. Si en algún momento un módulo (C) necesita
de verdad algo de otro (A) — no por error, sino por una necesidad de negocio real, algo esperable en un
proyecto que crece dentro de este monolito modular — la resolución no es relajar la regla en general: es
agregar una excepción angosta y explícita, tratada como su propio spec, nunca como un ajuste silencioso
dentro de otro feature.

Antes de agregar el import, elegir según qué necesita C de A:

- **Sólo lectura** (p. ej. "¿existe este producto, está activo?") → A expone una función pública
  explícita en un archivo nuevo, chico y deliberado — `modules/A/public.ts` — con sólo lo que A decide que
  otros pueden llamar. C importa de ahí, nunca de `A/ports/`, `A/domain/`, `A/infra/` ni `A/api/`
  directamente. Es A quien controla su superficie pública, no quien la consume.
- **Escritura que necesita ser atómica junto con la propia** (p. ej. "crear el pedido Y descontar stock,
  las dos o ninguna") → A expone en ese mismo `public.ts` un caso de uso completo (`reserveStock(tx,
  productId, qty)`), no un repositorio — ya encapsula las llamadas internas de A. C lo importa y le pasa
  el `tx` compartido. Sigue siendo un import cruzado, pero acotado y explícito.
- **Si no hace falta atomicidad real** (el caso más común en la práctica) → ni siquiera compartir `tx`: C
  llama a la ruta HTTP de A (o a su función pública, sin pasar transacción), toma la respuesta, y sigue
  con su propia transacción aparte — es lo que pasaría si A ya fuera un microservicio.

**Por qué no alcanza con "importar el `ports/` porque total es sólo una interfaz"**: usar esa interfaz
requiere una instancia real, y esa instancia opera dentro de un `Transaction`. Si C pasa el mismo `tx` que
usa A, C queda atado a cómo A persiste sus datos — el import "liviano" esconde un acoplamiento real de
persistencia, justo lo que esta regla busca evitar.

**Mecánica del cambio, cuando aparezca la necesidad real**: `server/module-boundaries.test.ts` gana una
excepción angosta — un import cruzado se permite únicamente si apunta a `modules/<x>/public.ts`, nunca a
`ports/`, `domain/`, `infra/` ni `api/` de otro módulo. Esa excepción se agrega como su propio spec (qué
dos módulos, por qué, qué superficie exacta se expone), no como un ajuste silencioso — es el tipo de
decisión de diseño que amerita quedar escrita y revisada. Es el mismo concepto que en Domain-Driven Design
se llama *published interface* / *open host service* de un bounded context — no algo inventado para este
proyecto.

## 5. Arquitectura (front / server / DB)

- Backend: `server/modules/<módulo>/{ports,domain,infra,api}` + `server/platform/{config,db,http}`
  transversal — arquitectura hexagonal (Ports & Adapters) aplicada por módulo vertical. El código en sí
  (`server/`, `src/`) es la referencia — `specs/001-scaffold-inicial/plan.md` documenta las decisiones que
  lo motivan, no lo transcribe.
- Todo repositorio recibe `tx: Transaction`; ningún caso de uso toca `pg` fuera de `infra/`.
- Doble implementación por puerto (`*.repository.pg.ts` + `*.repository.in-memory.ts`).
- Frontend: React + Vite, cliente API tipado en `src/lib/api.ts` — sin `fetch` suelto en componentes.
- Migraciones: `.sql` numerados en `server/migrations/`, `node-pg-migrate`, bloques Up/Down explícitos.

### 5.1. Frontend — sistema de diseño

- **Priorizar componentes open source ya probados y masivamente usados por sobre desarrollar algo a
  mano.** Para cualquier necesidad de UI (tablas, diálogos, navegación, formularios, estados de carga,
  etc.), la primera opción es buscar si un componente estándar de shadcn/ui (u otra librería ya
  establecida en el proyecto) la cubre — recién si genuinamente no existe uno que resuelva la necesidad se
  justifica escribir código propio, y esa decisión se deja dicha explícitamente en el spec
  correspondiente, no se asume en silencio.
- Componentes de UI: shadcn/ui, estilo `new-york` (fijado en `components.json`) — se usa el código fuente
  real de cada primitivo, nunca una versión propia simplificada.
- Toda tabla de datos va envuelta en `Card` (`CardHeader` con `CardTitle` + la acción principal en
  `CardAction`, `CardContent` con la `Table`) — nunca una tabla suelta directo en la página.
- Estados booleanos (activo/inactivo, etc.) se muestran con `Switch`, nunca con un botón de texto que
  alterna.
- Colecciones cortas (roles, tags, permisos de un ítem) se muestran con `Badge`, no como texto separado
  por comas.
- Botones de acción (crear/editar/borrar) siempre con ícono de `lucide-react` adelante del texto.
- Diálogos de edición: estado local de formulario, se persiste sólo al confirmar `Guardar` — nunca
  escritura parcial a la API en cada cambio de campo o checkbox. `Cancelar` descarta sin persistir.
- Toda acción y toda sección de navegación (ítem de sidebar) está gateada por `hasPermission()` de
  `useAuth()` — no se muestra lo que el usuario no puede usar.
- Navegación: componente `Sidebar` real de shadcn/ui, con ícono + label por sección, colapso funcional
  (estado persistido, atajo `Cmd/Ctrl+B`) — no tabs horizontales, no un `<aside>` armado a mano ni un
  ícono de colapsar decorativo. Mismo patrón que `App.tsx`.
- Menú de usuario: el área de usuario en el header (avatar + email) es el trigger de un `DropdownMenu`
  real de shadcn/ui, nunca un link de texto plano — con al menos un ítem "Cerrar sesión". Es el
  mismo patrón a seguir para cualquier acción nueva de cuenta que se agregue después (cambiar contraseña,
  preferencias, etc.): entra como ítem de este menú, no como un botón suelto más en el header.
- Columnas de acciones en una tabla (editar/borrar/marcar, etc.): la última columna, con el `TableHead`
  en `text-right` y los botones dentro de un contenedor `flex justify-end` — alineados a la derecha,
  nunca a la izquierda ni sueltos sin alinear.
- Paleta y tipografía: tokens de marca propios en `index.css` — color primario, acento, éxito,
  radios y las tres familias tipográficas (`--font-heading`/`--font-body`/`--font-mono`) — no la escala de
  grises que generaría `baseColor` por sí solo. Un módulo nuevo reusa estos tokens vía las clases de
  Tailwind (`bg-primary`, `text-muted-foreground`, etc.), nunca un color hardcodeado fuera de la paleta.
- Todo permiso del catálogo tiene una pantalla, **salvo que el spec de la feature diga explícitamente lo
  contrario** — por ejemplo, un permiso pensado sólo para acceso API-a-API (un servidor MCP, una
  integración con otro sistema, un script) que nunca se ejercita desde la UI. Es el default, no una regla
  absoluta: si un endpoint nuevo se gatea con `requirePermission(code)` y ese `code` no va a tener
  superficie de frontend, la excepción se declara en el `spec.md` correspondiente — no se asume en
  silencio ni queda como un olvido sin decir.
- El resultado de una acción que dispara el usuario (login, guardar, borrar, etc.) siempre llega a la
  pantalla — nunca sólo a la consola del navegador. El componente que ejecuta la acción de red no decide
  por sí solo qué hacer con un error: expone el resultado por `onSuccess`/`onError` (o equivalente) a quien
  lo monta, y ese padre es quien decide dónde mostrarlo — pero el mensaje real que devolvió el servidor es
  el que se muestra, no uno genérico inventado en el cliente. Dos variantes concretas, según el tipo de
  pantalla:
  - **Pantalla de una sola acción, sin shell alrededor** (el login): estado de error local + un `<p
    className="text-destructive">` bajo el control — `AuthGate`/`LoginButton`
    (`src/App.tsx`/`src/components/LoginButton.tsx`). `LoginButton` no sabe nada de la API ni de dónde se
    muestra el error: sólo expone `onSuccess(idToken)`/`onError(message)`.
  - **Cualquier vista dentro del shell autenticado** (tablas/ABM — `UsersView`, `RolesView`, el módulo de
    ejemplo, y cualquier vista nueva que se agregue después): la vista recibe una prop `onError: (error:
    unknown, context: { action: string; source: string }) => void`, envuelve cada llamada a la API en
    `try/catch` y llama a `onError(err, { action: 'Borrar rol X', source: 'RolesView.remove' })` en el
    catch — nunca deja una promesa sin manejar. `Shell` (`src/App.tsx`) es el único que sabe qué hacer con
    ese error: centraliza un `handleChildError`/`reportError` que (a) dispara un `toast.error(...)`
    (`sonner`, wrapper temático en `src/components/ui/sonner.tsx`) con un mensaje corto para el usuario, y
    (b) abre `ErrorDebugDialog` (`src/components/ErrorDebugDialog.tsx`) con el detalle técnico completo
    (status HTTP, método, URL, request/response body) armado por `buildErrorDebugPayload`
    (`src/lib/error-debug.ts`) — para cuando alguien necesita ver exactamente qué pasó, no sólo que algo
    falló. Una operación exitosa se confirma con `toast.success(...)` en la propia vista, no en `Shell`.
  - El detalle técnico sale de `ApiRequestError` (`src/lib/api.ts`), que no es sólo `message`/`status`:
    también trae `method`, `url`, `requestBody`/`responseBody`/`rawResponseBody`, y distingue
    `isNetworkError` (no hay red) de un error HTTP real (el servidor respondió, pero con status de error).
    Cualquier módulo/vista nueva que agregue un cliente a `api.ts` hereda esto automáticamente — no hay que
    repetir la lógica de captura, sólo usar `request()`.
  - Esta regla (como el resto de §5.1) no queda librada a que quien escriba un spec nuevo se acuerde de
    repasarla: `plan-template.md` §3 (Constitution Check) trae un checkbox propio para §5.1 que la nombra
    explícitamente — un `plan.md` que agregue una vista y sólo diga "mismo patrón visual que [otra vista]"
    no cumple ese checkbox, porque el manejo de errores es una convención distinta de la visual y se
    declara aparte.

## 6. Branching model: Gitflow

- `main` = producción, `develop` = integración.
- Cada spec se desarrolla en `feature/NNN-slug`, PR contra `develop`.
- `develop` se promueve a `main` por PR aparte, cuando el equipo decide desplegar.
- Nunca commit directo a `main` ni a `develop`.

## 7. Convenciones técnicas (no son regla de negocio de este proyecto)

- IDs `BIGSERIAL`/`BIGINT` — no UUID, decisión explícita (mejor localidad de índice + mitad de espacio
  para un monolito sin réplica entre sistemas; el control de acceso real es `authenticate`+
  `requirePermission`, no la unicidad del ID) — mapeados a `number` vía un helper `num()` en cada repo pg.
- Schema de Postgres propio del proyecto, nunca `public` — `{{DB_SCHEMA}}` (derivado del nombre del
  proyecto), fijado por `--schema --create-schema` en `node-pg-migrate` y por `search_path` en el pool de
  runtime. Ningún `CREATE TABLE` ni query necesita calificar el nombre de tabla con el schema.
- **Idioma: todo en inglés, sin excepción** — identificadores de código Y nombres de tabla/columna/schema.
  Proyecto greenfield, sin legado que migrar — no hay razón para mezclar idiomas como sí puede justificarse
  en un proyecto que hereda un modelo de datos preexistente en otro idioma. Los documentos de spec
  (`spec.md`/`plan.md`/`tasks.md`) siguen en español (§2) — la distinción es documento vs. código, no una
  excepción al inglés en el código.
- Catálogo de permisos plano: `permission(code PK, description)`, formato `recurso.acción[.calificador]`.
- M:N vía tablas puente explícitas con PK compuesta, `ON DELETE CASCADE` desde el lado padre.
- Validación de request body con Zod inline en cada ruta.
- Errores de dominio como clases (`class XError extends Error`), traducidos a status HTTP con
  `instanceof` en la capa `api/`.
- Config de entorno validada con Zod al import — falla cerrado antes de levantar el server.
- Tests: Vitest. Unitarios contra repos en memoria. Integración (`*.pg.test.ts`) contra Postgres real,
  `describe.skipIf(!process.env.DATABASE_URL)`, aislados con `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` dentro de
  una transacción externa también revertida.

## Referencias

- El código en sí (`server/`, `src/`) es la referencia completa — `specs/001-scaffold-inicial/plan.md`
  documenta las decisiones que lo motivan, no lo transcribe.
