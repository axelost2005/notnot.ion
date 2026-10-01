# notnot.ion — Spec

## Qué es
App personal para organizar el laburo por cliente. Cada cliente o categoría tiene su tablero kanban y, al lado, un panel de notas rápidas: escribís como en un chat con vos mismo y cada línea que empieza con `[]` se convierte en tarjeta.

- Un solo usuario. Sin registro ni cuentas: solo un candado con código (ver "Candado").
- Web + PWA instalable en celu y compu. Sin tiendas.
- Los datos viven en la API: lo que anotás en el celu aparece en la compu. Sin tiempo real: se refresca al volver a la app.

## Conceptos
- **Tablero**: un cliente o categoría ("Pepito", "Personal"). Tiene nombre, slug para `@`, color, columnas, tarjetas y notas. Siempre existe **Inbox** (no se borra ni se archiva) para lo que no es de nadie.
- **Columna**: por defecto "Por hacer", "En curso" y "Hecho". Exactamente una por tablero es la de terminadas (`isDone`, default "Hecho").
- **Tarjeta**: una tarea. Título, descripción opcional, columna y orden. Puede venir de una nota.
- **Nota**: texto libre dentro de un tablero. Se crea, se lee y se borra; no se edita en el MVP.

## Modelo de datos
| Modelo | Campos |
|---|---|
| Board | id, name, slug (único), color, position, isInbox, archivedAt?, createdAt, updatedAt |
| Column | id, boardId, name, position, isDone, createdAt, updatedAt |
| Task | id, boardId, columnId, title, description?, position, completedAt?, noteId?, noteLine?, createdAt, updatedAt |
| Note | id, boardId, content, createdAt |

- Cada tablero tiene al menos 1 columna normal y exactamente 1 `isDone`.
- `Task.columnId` siempre pertenece a `Task.boardId`.
- `completedAt` se setea al entrar a la columna `isDone` y se limpia al salir.
- `position` es una clave de fractional indexing (string): mover actualiza solo la fila movida. Índices en las FKs y en `(columnId, position)`.
- Borrar un tablero borra en cascada columnas, tareas y notas. Borrar una nota deja sus tareas (`noteId` y `noteLine` en null).
- Slug: minúsculas, sin acentos, espacios → guiones ("Pepito Pérez" → `pepito-perez`). Si choca, `-2`, `-3`… Se regenera al renombrar.
- Color: paleta fija de 8.
- Límites: nombre de tablero 1–40, título 1–200, descripción ≤ 5000, nota 1–5000, máximo 50 tareas por nota.

## Notas → tareas (el corazón de la app)
Parser puro en `packages/shared`: `parseNote(content, { currentBoardSlug, boards })` devuelve las líneas tipadas (`text` o `task` con título y slug destino). Lo usa la API para crear (es la autoridad) y la web para la vista previa.

- Es tarea la línea que arranca (ignorando espacios) con `[]`, `[ ]`, `- []`, `- [ ]` o `* [ ]`. El resto de la línea es el título.
- `@slug` manda la tarea a ese tablero y se saca del título. Sin `@`, va al tablero donde escribís. Si hay varios, gana el primero válido. Un `@algo` que no existe o está archivado queda como texto y la tarea va al tablero actual.
- Los slugs se comparan sin mayúsculas ni acentos.
- Si el título queda vacío, la línea no es tarea. Si pasa de 200 caracteres, se corta.
- Las tareas nuevas van al final de la primera columna normal del tablero destino.
- Nota y tareas se crean en una sola transacción: todo o nada.
- La API devuelve cada nota con sus tareas (`id`, `noteLine`, título actual, tablero, si está terminada).

Panel de notas:
- Tipo chat: más nuevas abajo, hora relativa, composer abajo. Carga 50 y trae más al scrollear hacia arriba.
- Desktop: Enter envía, Shift+Enter hace salto de línea. Mobile: botón enviar.
- Vista previa bajo el composer: "2 tareas → Pepito, Inbox".
- Chips en el composer: `[ ]` pone el marcador al inicio de la línea actual; `@` abre el autocompletado. En mobile son la forma principal.
- Autocompletado de `@` con los tableros activos, por nombre o slug.
- Borrador por tablero guardado en localStorage.
- Cada línea-tarea se ve como checkbox + título actual de la tarjeta (+ chip del tablero si es otro). Tildar la manda al final de la columna `isDone`; destildar la vuelve arriba de la primera columna normal. Tocar el título abre la tarjeta.
- Si la tarjeta se borró, la línea queda tachada con el texto original.
- Links clickeables. Borrar una nota pide confirmación.

## Candado (sin login)
La app vive en una URL pública, así que la API no puede quedar abierta. No hay usuarios: hay un solo código.

- `APP_SECRET`: frase larga (4 o más palabras al azar). Pantalla `/unlock` con un input.
- `POST /api/unlock` compara con `timingSafeEqual` sobre hashes. Si coincide, setea una cookie httpOnly, SameSite=Lax, Secure en prod, firmada con `SESSION_SECRET`, que dura 1 año.
- Middleware en todo `/api/*` salvo `/api/health` y `/api/unlock`. Si la web recibe un 401, va a `/unlock`.
- Rate limit en `/api/unlock`: 5 intentos cada 15 min por IP. En serverless es aproximado; la protección real es que el código sea largo.
- Botón "Bloquear" que borra la cookie. Rotar `SESSION_SECRET` cierra todas las sesiones.
- Web y API en el mismo origen: cookie first-party y sin CORS.
- `noindex` y `robots.txt` que bloquea todo.
- En iOS, la app instalada puede pedir el código otra vez (tiene su propio almacenamiento).

## API
REST + JSON bajo `/api`. Toda entrada se valida con los schemas de `shared`. Errores: `{ error: { code, message } }` con 400, 401, 404 o 409 según corresponda.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Chequeo simple |
| POST | `/unlock`, `/lock` | Abre / cierra la sesión |
| GET | `/session` | 200 si está desbloqueado, si no 401 |
| GET | `/boards` | Tableros (activos y archivados) con cantidad de tareas abiertas |
| POST | `/boards` | Crea el tablero con las 3 columnas default |
| GET | `/boards/:id` | Tablero + columnas + tareas ordenadas |
| PATCH / DELETE | `/boards/:id` | Editar (nombre, color, archivar) / borrar |
| POST | `/boards/:id/columns` | Nueva columna |
| PATCH / DELETE | `/columns/:id` | Editar / borrar (solo si está vacía; si no, 409) |
| POST | `/tasks` | Nueva tarea |
| PATCH / DELETE | `/tasks/:id` | Editar / borrar |
| POST | `/tasks/:id/move` | `{ columnId, boardId?, prevId?, nextId? }`: vecinos de arriba y abajo en el lugar nuevo; la API calcula `position` |
| POST | `/tasks/:id/toggle-done` | A la columna `isDone` o de vuelta a la primera columna normal |
| GET | `/boards/:id/notes?before=` | 50 notas por página, cada una con sus tareas |
| POST | `/notes` | `{ boardId, content }` → nota + tareas |
| DELETE | `/notes/:id` | Borra la nota; las tareas quedan |

## UI
- Rutas: `/unlock` y `/b/:slug` (la web resuelve slug → id con la lista de tableros). `/` redirige al último tablero abierto o a Inbox.
- Desktop: sidebar (Inbox fijo arriba, tableros con color y contador de abiertas, archivados colapsados, "+ Nuevo tablero", "Bloquear"), kanban al centro con scroll horizontal, panel de notas a la derecha (~360px, plegable).
- Columna: título, contador, "+ Agregar tarjeta" al pie y menú (renombrar, marcar como terminadas, borrar).
- Tarjeta: click abre el detalle (título, descripción, mover a otro tablero o columna, borrar, link a la nota de origen).
- Mobile (<768px): header con selector de tablero, tabs abajo "Tablero" / "Notas", columnas de a una con swipe (scroll-snap). Reordenar dentro de la columna con long-press; cambiar de columna o tablero con "Mover a…".
- Estética sobria y prolija tipo Linear, claro/oscuro según el sistema, color de acento por tablero. Estados vacíos y de carga cuidados. Toasts para errores.
- Accesible: drag & drop con teclado, labels en botones de ícono, foco visible.
- Datos con TanStack Query: refetch al volver a la app y optimistic updates al mover tarjetas, tildar y crear notas.

## PWA
- vite-plugin-pwa con `autoUpdate`. Manifest: name "notnot.ion", short_name "notnot", display standalone, colores de tema, íconos 192/512 + maskable, apple-touch-icon.
- Ícono: un SVG simple propio → PNGs con `@vite-pwa/assets-generator`.
- Shortcut del manifest "Nueva nota": abre Inbox en Notas con el composer enfocado.
- Precache del shell; la API va siempre por red (sin offline en el MVP). Banner "Sin conexión" cuando no hay red.
- Botón "Instalar" cuando el browser lo permita; en iOS, tip "Compartir → Agregar a inicio".

## Deploy
- Vercel para web y API en el mismo origen (`/api/*` → Express). Elegí la config más simple que cumpla eso.
- Neon: branch `dev` para local y `main` para prod. En prod, migraciones con `prisma migrate deploy`.
- Prisma según la guía actual de Prisma + Neon para serverless (URL pooled en runtime, directa para migraciones).
- Variables: `DATABASE_URL`, `DIRECT_URL` si Prisma la pide, `APP_SECRET`, `SESSION_SECRET`. Se validan con Zod al arrancar la API.
- Node LTS fijado en `.nvmrc` y en `engines`.

## Estructura
```
notnot.ion/
├── apps/
│   ├── web/                 Vite + React (PWA)
│   │   ├── e2e/             tests de Playwright
│   │   └── src/
│   │       ├── app/         router, providers, layout
│   │       ├── features/    lock/ boards/ kanban/ notes/ (componentes, hooks, llamadas a la API)
│   │       ├── components/  ui/ (shadcn) y compartidos
│   │       └── lib/         cliente http, utils
│   └── api/                 Express
│       ├── src/
│       │   ├── routes/      un router por recurso
│       │   ├── services/    lógica + Prisma
│       │   ├── middleware/  candado, validación, errores
│       │   ├── env.ts       variables validadas con Zod
│       │   ├── app.ts       arma la app (testeable, sin listen)
│       │   └── server.ts    listen (solo local)
│       └── prisma/          schema.prisma, migrations/, seed.ts
├── packages/shared/src/     schemas/ parser/ ordering/ slug/
├── docs/                    SPEC.md y PROGRESO.md
├── .github/workflows/ci.yml
├── CLAUDE.md
└── README.md
```

## Calidad
- Vitest en `shared` (parser, slug y orden con muchos casos) y Supertest en la API (candado y validaciones, sin base). Tests de rutas con base: después, con un branch `test` en Neon.
- e2e con Playwright (headless) en `apps/web/e2e/`, contra la app levantada en local: un test por cada "Listo cuando". Los tests crean sus propios datos (nombres con prefijo `e2e-`) y los borran al terminar. Se corren con `pnpm e2e` y no entran en CI.
- CI en GitHub Actions: `pnpm check` en cada push y PR.
- README en español: qué es, stack, cómo correrlo, scripts y capturas.

## Fases
Se hacen de corrido, siguiendo el flujo de `CLAUDE.md`. Cada fase termina cuando su "Listo cuando" pasa con la app levantada (curl + e2e).

### Fase 0 — Cimientos
- git con commits directo en `main` (es el arranque), `.gitignore`, `.nvmrc`, monorepo pnpm con los 3 paquetes, tsconfig base estricto, ESLint + Prettier, Vitest.
- Web: Vite + React + Tailwind + shadcn/ui + React Router + TanStack Query, con una home placeholder que muestra "notnot.ion" y el estado de `/api/health`.
- API: Express 5 con `app.ts` y `server.ts`, `GET /api/health`, manejo de errores y 404, `env.ts`.
- Shared: estructura + `slugify` con tests.
- Prisma: modelo completo, migración inicial y seed idempotente de Inbox con sus 3 columnas. Si falta `DATABASE_URL`, frená y pedímela.
- Proxy `/api` de Vite, `pnpm dev` levantando todo y los scripts de la raíz.
- Playwright configurado (`pnpm e2e`) con un primer test: la home muestra "API ok".
- CI, README y `.env.example`.
- Repo público `notnot.ion` en GitHub con `gh` y primer push. Si `gh` no está instalado o logueado, dejá los comandos en `docs/PROGRESO.md` y seguí en local.

**Listo cuando:** el e2e ve la home con "API ok", la migración y el seed corren, y `pnpm check` pasa (también en CI, si hubo push).

### Fase 1 — Candado, tableros y primer deploy
- Candado completo (pantalla, cookie, middleware, rate limit, bloquear) con tests.
- Layout con sidebar. Tableros: crear (nombre + color), renombrar, archivar/desarchivar, borrar con confirmación, Inbox protegido, contador de abiertas.
- Ruta `/b/:slug` y redirección de `/`.
- Deploy a Vercel + Neon `main`: si `vercel` está logueado, deployá; si no, dejá la config lista y los pasos manuales que tenga que hacer yo en `docs/PROGRESO.md` (proyecto, variables, branch).

**Listo cuando:** en local me pide el código, entro y manejo tableros, y `/api/boards` sin cookie devuelve 401. Si se pudo deployar, lo mismo en prod.

### Fase 2 — Kanban
- Vista del tablero: columnas y tarjetas. Crear tarjeta al pie de cada columna, detalle, editar y borrar.
- Drag & drop dentro y entre columnas (mouse, teclado y touch con long-press) con optimistic updates y `move`.
- Columnas: agregar, renombrar, borrar vacías y elegir la de terminadas, respetando las reglas del modelo.
- Tests de los helpers de orden.

**Listo cuando:** el e2e crea tarjetas, mueve una dentro de su columna y otra a otra columna, recarga y el orden se mantiene.

### Fase 3 — Notas → tareas
- `parseNote` en `shared` con tests: marcadores, `@` válido/inexistente/archivado/repetido, acentos, líneas vacías y títulos largos.
- API de notas (listar paginado, crear en transacción, borrar) y `toggle-done`.
- Panel de notas completo (ver "Notas → tareas").

**Listo cuando:** el e2e crea un tablero, escribe desde Inbox `[] llamar al cliente @<slug>` y la tarjeta aparece al final de "Por hacer" de ese tablero; tildarla en la nota la pasa a "Hecho" y moverla en el tablero actualiza el checkbox; borrar la nota deja la tarjeta.

### Fase 4 — PWA y mobile
- Todo lo de "PWA".
- Layout mobile: selector de tablero, tabs, swipe de columnas, "Mover a…".
- README final con capturas.

**Listo cuando:** el build de prod servido en local es instalable (manifest y service worker válidos) y el e2e en viewport de 375px captura una nota y mueve una tarjeta con "Mover a…". Instalarla en el celu y en la compu lo hago yo después del deploy.

## Después (no ahora)
- IA para procesar notas desordenadas (Claude API desde la API, con confirmación antes de crear).
- Fechas y recordatorios ("mañana", "viernes").
- Búsqueda, filtros, etiquetas, prioridad y vista "todas mis tareas".
- Offline completo y tiempo real entre dispositivos.
- Link de solo lectura para que un cliente vea su tablero.
- Atajos de teclado, editar notas, reordenar tableros.
