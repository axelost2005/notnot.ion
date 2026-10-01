# notnot.ion — Spec

## Qué es
App personal para organizar el laburo por cliente. Cada cliente o categoría tiene su tablero kanban y, al lado, un panel de notas rápidas: escribís como en un chat con vos mismo y cada línea que empieza con `[]` se convierte en tarjeta.

- Un solo usuario. Sin registro ni cuentas: solo un candado con código (ver "Candado").
- Web + PWA instalable en celu y compu. Sin tiendas.
- Los datos viven en la API: lo que anotás en el celu aparece en la compu. Sin tiempo real: se refresca al volver a la app.

## Conceptos
- **Tablero**: un cliente o categoría ("Pepito", "Personal"). Tiene nombre, slug para `@`, color, columnas, tarjetas y notas. Siempre existe **General** (no se renombra, archiva ni borra): va arriba de todo, su kanban muestra las tarjetas de todos los tableros activos y guarda lo que no es de ningún cliente.
- **Historial**: cada día arranca con la columna de terminadas vacía. Las tarjetas terminadas antes de hoy (medianoche del dispositivo) salen del tablero y quedan en el historial.
- **Columna**: por defecto "Por hacer", "En curso" y "Hecho". Exactamente una por tablero es la de terminadas (`isDone`, default "Hecho").
- **Tarjeta**: una tarea. Título, descripción opcional, columna y orden. Puede venir de una nota.
- **Nota**: texto libre dentro de un tablero. Se crea, se lee y se borra; no se edita en el MVP.

## Modelo de datos
| Modelo | Campos |
|---|---|
| Board | id, name, slug (único), color, position, isGeneral, archivedAt?, createdAt, updatedAt |
| Column | id, boardId, name, position, isDone, createdAt, updatedAt |
| Task | id, boardId, columnId, title, description?, position, completedAt?, archivedAt?, noteId?, noteLine?, createdAt, updatedAt |
| Note | id, boardId, content, createdAt |

- Cada tablero tiene al menos 1 columna normal y exactamente 1 `isDone`.
- `Task.columnId` siempre pertenece a `Task.boardId`.
- `completedAt` se setea al entrar a la columna `isDone` y se limpia al salir.
- `archivedAt` se setea cuando una tarjeta terminada pasa al historial. Las archivadas no se ven en el kanban ni cuentan para las reglas de columnas (vecinos al mover, columna vacía). Destildarla desde su nota o moverla la vuelve al tablero.
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
- El composer arranca con `[] ` y vuelve a `[] ` después de enviar: escribir y dar Enter crea una tarea por vez. Para una nota común se borran los corchetes.
- Vista previa bajo el composer: "2 tareas → Pepito, General".
- Chips en el composer: `[ ]` pone el marcador al inicio de la línea actual; `@` abre el autocompletado. En mobile son la forma principal.
- Autocompletado de `@` con los tableros activos, por nombre o slug.
- Borrador por tablero guardado en localStorage.
- Cada línea-tarea se ve como checkbox + título actual de la tarjeta (+ chip del tablero si es otro). Tildar la manda al final de la columna `isDone`; destildar la vuelve arriba de la primera columna normal. Tocar el título abre la tarjeta (salvo que esté en el historial o en la ventana de notas).
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
| GET | `/general` | Columnas y tarjetas (sin archivar) de todos los tableros activos, para el kanban de General |
| GET | `/history?boardId=&before=` | Tarjetas del historial, de la más nueva a la más vieja, 50 por página. Sin `boardId`, las de todos los tableros |

La web manda en cada pedido `X-Day-Start` con la medianoche de hoy en el dispositivo (ISO). Al leer un tablero, General, notas o historial, la API pasa al historial las terminadas antes de esa hora. Sin el header (o si está a más de 48 h de la hora del server) no archiva nada: no hace falta ninguna tarea programada.

## UI
- Rutas: `/unlock`, `/b/:slug` (la web resuelve slug → id con la lista de tableros) y `/notas/:slug` (la ventana de notas). `/` redirige al último tablero abierto o a General.
- Desktop: sidebar (General fijo arriba con el total de abiertas, tableros con color y contador de abiertas, archivados colapsados, "+ Nuevo tablero", "Bloquear"), kanban al centro con scroll horizontal, panel de notas a la derecha (~360px, plegable).
- Header del tablero: "Historial" (panel lateral con las terminadas, agrupadas por día; en General, las de todos con el chip de su tablero) y, en desktop, "Abrir las notas en otra ventana".
- Ventana de notas (`/notas/:slug`): una ventana chica aparte (`window.open`, ~400×640) con solo el panel de notas y un selector de tablero arriba. Cambiar de tablero cambia dónde se escriben las notas y a dónde van las tareas sin `@`. Lo que cambia en una ventana se refresca en las otras (BroadcastChannel).
- General: tres columnas fijas por estado con las tarjetas de todos los tableros activos. "Por hacer" = la primera columna normal de cada tablero, "En curso" = las otras normales, "Hecho" = la de terminadas. Cada tarjeta muestra el chip de su tablero (las de General no llevan). Dentro de cada columna van agrupadas por tablero, en el orden de la sidebar. Arrastrar una tarjeta a otra columna la mueve al final de esa columna en su propio tablero ("En curso" va a la segunda columna normal; si el tablero no tiene, avisa y no la mueve). No se reordena dentro de una columna ni se editan las columnas de General. "Agregar tarjeta" en "Por hacer" crea una tarea de General.
- Columna: título, contador, "+ Agregar tarjeta" al pie y menú (renombrar, marcar como terminadas, borrar).
- Tarjeta: click abre el detalle (título, descripción, mover a otro tablero o columna, borrar, link a la nota de origen).
- Mobile (<768px): header con selector de tablero, tabs abajo "Tablero" / "Notas", columnas de a una con swipe (scroll-snap). Reordenar dentro de la columna con long-press; cambiar de columna o tablero con "Mover a…".
- Estética sobria y prolija tipo Linear, claro/oscuro según el sistema, color de acento por tablero. Estados vacíos y de carga cuidados. Toasts para errores.
- Accesible: drag & drop con teclado, labels en botones de ícono, foco visible.
- Datos con TanStack Query: refetch al volver a la app y optimistic updates al mover tarjetas, tildar y crear notas.

## PWA
- vite-plugin-pwa con `autoUpdate`. Manifest: name "notnot.ion", short_name "notnot", display standalone, colores de tema, íconos 192/512 + maskable, apple-touch-icon.
- Ícono: un SVG simple propio → PNGs con `@vite-pwa/assets-generator`.
- Shortcut del manifest "Nueva nota": abre General en Notas con el composer enfocado.
- Precache del shell; la API va siempre por red (sin offline en el MVP). Banner "Sin conexión" cuando no hay red.
- Botón "Instalar" cuando el browser lo permita; en iOS, tip "Compartir → Agregar a inicio".

## Deploy
- Vercel para web y API en el mismo origen (`/api/*` → Express). Elegí la config más simple que cumpla eso.
- Neon: branch `dev` para local y `production` (el principal) para prod. En prod, migraciones con `prisma migrate deploy`.
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
- Deploy a Vercel + Neon `production`: si `vercel` está logueado, deployá; si no, dejá la config lista y los pasos manuales que tenga que hacer yo en `docs/PROGRESO.md` (proyecto, variables, branch).

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

### Fase 5 — Ventana de notas, General e Historial
Un PR por paso, en este orden:
1. Composer que arranca con `[] ` y vuelve a `[] ` al enviar.
2. Ventana de notas (`/notas/:slug`) con selector de tablero, botón en el header y refresco entre ventanas.
3. Historial: `archivedAt`, archivado al leer con `X-Day-Start`, `GET /history` y el panel "Historial".
4. General: Inbox pasa a ser General (`isInbox` → `isGeneral`, nombre y slug `general` si está libre), `GET /general`, su kanban por estado con drag & drop entre columnas, contador total en la sidebar.

**Listo cuando:** el e2e escribe `algo` + Enter y aparece la tarjeta con el composer otra vez en `[] `; abre la ventana de notas, cambia de tablero y la tarea cae en el elegido (y la ventana principal la muestra sin recargar); con el reloj del navegador en mañana, la tarjeta terminada ya no está en "Hecho" y sí en el Historial; General muestra tarjetas de dos tableros con su chip y arrastrar una a "En curso" la mueve en su tablero.

### Fase 6 — Correcciones, imágenes, Notas y Finanzas
Una rama y un PR por paso, en este orden. Producción tiene datos reales: las migraciones solo agregan (nada de resets).

1. **Correcciones.**
   - Selector de tablero propio en la ventana de notas: popover con el punto de color de cada tablero, el actual marcado, y teclado y foco bien. El mismo componente en "Mover a…" del detalle de la tarjeta.
   - Tarjeta como fila: checkbox a la izquierda y, a la derecha, el título en negrita y una línea de la descripción en gris cortada con "…". El checkbox tilda y destilda como desde la nota (`toggle-done`), no abre la tarjeta ni la arrastra y anda con teclado. En General, con el chip del tablero. Sin el `[]` ni el ícono de descripción.
   - "En curso" recibe tarjetas: toda la columna es zona para soltar (también el título y el pie), con mouse y con touch, en los tableros y en General. En General, "Agregar tarjeta" en las tres columnas: crea tareas de General en la columna que corresponde.
   - Título de las columnas con color según su rol (`laneOf`): la primera normal celeste, las otras normales amarillas y la de terminadas verde. Tokens en `index.css` para claro y oscuro, con buen contraste.

   **Listo cuando:** el e2e cambia de tablero en la ventana de notas con el teclado y sigue escribiendo; tilda y destilda una tarjeta desde su checkbox (en un tablero y en General) sin abrirla; la tarjeta muestra la primera línea de la descripción; con "Por hacer" y "Hecho" llenas, arrastrar a "En curso" vacía la mueve (con mouse y con touch, también soltando sobre el título), en un tablero y en General; y en General se agrega una tarjeta en "En curso" y otra en "Hecho".

2. **Imágenes en las tareas.**
   - En el detalle de la tarjeta: pegar (Ctrl+V), arrastrar (en la compu) o el botón "Adjuntar imagen" (en el celu abre la galería o la cámara). El navegador la achica (2000 px como máximo) y la pasa a WebP antes de subirla.
   - Miniaturas chicas que se pueden borrar (con confirmación). Al tocar una, se agranda desde la miniatura (GSAP Flip) a un tamaño grande pero no de pantalla completa, con el fondo oscurecido; se cierra con click, Esc o tocando afuera. Con `prefers-reduced-motion`, sin animación.
   - Privadas: Vercel Blob privado, un store para Development y Preview y otro para Production. La API las sirve detrás del candado con `Cache-Control: private, max-age=31536000, immutable` (no cambian una vez subidas).
   - Miniaturas y visor como componentes reutilizables (los usa Finanzas).

   **Listo cuando:** el e2e adjunta una imagen con el input de archivo y otra pegándola, ve las miniaturas, agranda una y la cierra con Esc, recarga y siguen ahí; sin cookie, la imagen da 401; borrar una la saca.

3. **Notas.** Una sección aparte de los tableros para guardar cosas que no son tareas.
   - En la sidebar, abajo de los tableros: un árbol plegable de carpetas (con carpetas adentro) y notas, que pueden estar en una carpeta o sueltas en la raíz. Carpetas primero, en orden alfabético.
   - Crear, renombrar, mover ("Mover a…") y borrar carpetas y notas. Borrar una carpeta con contenido pide confirmación y borra todo lo de adentro.
   - Cada nota tiene título y texto, y se guarda sola mientras escribís.
   - En el código son `Folder` y `Page` (`Note` son las notas de los tableros). Ruta web: `/p/:id`.
   - En el celu se abre desde el mismo panel lateral de los tableros; en una nota, el título del header lo abre.

   **Listo cuando:** el e2e crea una carpeta con una subcarpeta, una nota adentro y otra suelta; escribe en una, recarga y el texto sigue; la mueve a la raíz con "Mover a…"; renombra la carpeta; borrarla pide confirmación y se lleva lo de adentro. En 375 px se llega a una nota desde el panel lateral.

4. **Finanzas.** Un registro de los pagos que me hicieron, con sus comprobantes, para poder mostrar qué se pagó y qué no.
   - Solo ingresos, en ARS o USD. Cada pago: fecha, monto, moneda, cliente (opcional, uno de los tableros), categoría (libre, con autocompletado de las ya usadas), descripción y comprobantes (imágenes, con las miniaturas y el visor del paso 2).
   - Organizado por mes (`/finanzas/2026-10`; `/finanzas` abre el actual): flechas para ir y volver y la lista de los meses con pagos. Totales del mes por moneda. Dentro del mes, por fecha o agrupados por categoría (con subtotales).
   - En la sidebar, "Finanzas" abajo de Notas. En el código, `Payment`.

   **Listo cuando:** el e2e carga dos pagos en el mes (uno en ARS con cliente y comprobante, otro en USD), ve los totales por moneda, los agrupa por categoría, cambia de mes y vuelve, edita uno y borra el otro.

## Después (no ahora)
- IA para procesar notas desordenadas (Claude API desde la API, con confirmación antes de crear).
- Fechas y recordatorios ("mañana", "viernes").
- Búsqueda, filtros, etiquetas y prioridad.
- Offline completo y tiempo real entre dispositivos.
- Link de solo lectura para que un cliente vea su tablero.
- Atajos de teclado, editar notas, reordenar tableros.
