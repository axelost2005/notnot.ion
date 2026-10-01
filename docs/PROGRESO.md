# Progreso

## Fase actual

**Fase 4 — PWA y mobile: cerrada.** Las cinco fases (0 a 4) están hechas y la app está en producción. Falta solo instalarla (ver "Pendientes para vos").

## Hecho

### Fase 0 — Cimientos

- Monorepo pnpm (`apps/web`, `apps/api`, `packages/shared`), TypeScript estricto, ESLint (type-aware) + Prettier, Vitest.
- `shared`: `slugify`, `uniqueSlug`, `normalizeForMatch`, helpers de orden (fractional indexing) y constantes (límites, paleta, columnas default). Con tests.
- API: Express 5 con `app.ts` (sin listen) y `server.ts`, `GET /api/health`, 404 y errores con formato `{ error: { code, message } }`, variables validadas con Zod en `env.ts`.
- Prisma: modelo completo, migración inicial aplicada en Neon `dev` y seed idempotente de Inbox con sus 3 columnas.
- Web: Vite + React + Tailwind + shadcn/ui + React Router + TanStack Query.
- `pnpm dev` levanta web y API; Vite proxea `/api`. Playwright (`pnpm e2e`), CI en GitHub Actions, README y `.env.example`.
- Repo público: https://github.com/axelost2005/notnot.ion

### Fase 1 — Candado, tableros y primer deploy

- Candado: `POST /api/unlock` (hash SHA-256 + `timingSafeEqual`), cookie firmada `httpOnly`, `SameSite=Lax`, `Secure` en prod, de 1 año; middleware en todo `/api/*` salvo `/health` y `/unlock` (también las rutas que no existen); rate limit de 5 intentos fallidos cada 15 min por IP; `POST /api/lock`; `GET /api/session`. Con tests (Supertest, sin base).
- Tableros en la API: listar (con tareas abiertas), detalle con columnas y tareas ordenadas, crear (con las 3 columnas), renombrar (regenera el slug), color, archivar/desarchivar y borrar. Inbox protegido.
- Web: pantalla `/unlock`, cualquier 401 vuelve ahí; layout con sidebar (Inbox arriba, tableros con color y contador de abiertas, archivados colapsados, "Nuevo tablero", "Bloquear"); `/b/:slug`; `/` abre el último tablero usado o Inbox; diálogo de crear/editar con vista previa del `@slug`; borrar con confirmación; toasts para errores; claro/oscuro según el sistema.
- e2e (`apps/web/e2e/lock-and-boards.spec.ts`): 401 sin cookie, código incorrecto, entrar y bloquear, ciclo completo de un tablero, Inbox protegido, validación y "último tablero".
- Deploy: config lista (`vercel.json` + `scripts/build-vercel.mjs`), proyecto `notnot-ion` en Vercel, con las previews contra Neon `dev` y producción contra Neon `production`.

### Fase 2 — Kanban

- API: `POST /boards/:id/columns`, `PATCH`/`DELETE /columns/:id`, `POST /tasks`, `PATCH`/`DELETE /tasks/:id` y `POST /tasks/:id/move` (calcula `position` con los vecinos y actualiza solo esa fila; también mueve a otro tablero). Validaciones con tests.
- `shared`: schemas de columnas y tareas, y helpers de movimiento (`slotAt`, `isValidSlot`, `positionForSlot`) con tests.
- Web: columnas con título, contador, menú (renombrar, usar para terminadas, borrar) y "Agregar tarjeta" al pie; "Agregar columna"; tarjetas con indicador de descripción; detalle (título, descripción, mover a otro tablero o columna, borrar con confirmación).
- Drag & drop con dnd-kit: mouse, teclado (espacio + flechas, con anuncios en español para lectores de pantalla) y touch con long-press. Optimista: la tarjeta se mueve al toque y vuelve si la API dice que no.
- e2e (`apps/web/e2e/kanban.spec.ts`): crear tarjetas, mover dentro y entre columnas con mouse, recargar y mantener el orden; mover con teclado; detalle; columnas.

### Fase 3 — Notas → tareas

- `parseNote` en `shared` con tests (marcadores, `@` válido/inexistente/archivado/repetido, acentos, mails, líneas vacías, títulos largos, saltos de Windows).
- API: `GET /boards/:id/notes?before=` (50 por página, cada nota con sus tareas: id, línea, título actual, tablero y si está terminada), `POST /notes` (nota y tareas en una sola escritura), `DELETE /notes/:id` (las tareas quedan) y `POST /tasks/:id/toggle-done`.
- Panel de notas a la derecha (360 px, plegable desde "Notas" en el header): tipo chat con hora relativa, carga 50 y trae más al scrollear hacia arriba, Enter envía y Shift+Enter hace salto de línea (en touch, botón enviar), chips `[ ]` y `@`, autocompletado de tableros activos por nombre o slug, vista previa ("2 tareas → Pepito, Inbox"), borrador por tablero en localStorage, checkbox + título actual + chip del tablero, tildar/destildar optimista (mueve la tarjeta en el kanban al toque), tocar el título abre la tarjeta, línea tachada si la tarjeta se borró, links clickeables y borrar con confirmación.
- El detalle de una tarjeta que salió de una nota tiene "Ver la nota", que abre el tablero de la nota con esa nota resaltada (`?nota=<id>`).
- e2e (`apps/web/e2e/notes.spec.ts`): el "Listo cuando" completo (Inbox → `@tablero`, al final de "Por hacer", tildar → "Hecho", mover en el tablero → checkbox, borrar la nota deja la tarjeta), composer, tachado y links, scroll infinito y link a la nota de origen.

### Fase 4 — PWA y mobile

- PWA con `vite-plugin-pwa` (`autoUpdate`): manifest (nombre, `short_name`, standalone, colores, íconos 192/512 + maskable, apple-touch-icon), atajo "Nueva nota" (abre Inbox en Notas con el composer enfocado), service worker que precachea solo el shell (la API va siempre por red), banner "Sin conexión" y botón "Instalar app" cuando el navegador lo permite, con el tip "Compartir → Agregar a inicio" en iOS.
- Íconos: `apps/web/public/icon.svg` (el `[ ]` de la marca) → PNGs con `@vite-pwa/assets-generator` (`pnpm --filter @notnot/web icons`).
- Mobile (< 768 px): el título del tablero es el selector (abre la lista de tableros), tabs "Tablero" / "Notas" abajo, columnas de a una con swipe (scroll-snap), reordenar con long-press y "Mover a…" en el detalle de la tarjeta para cambiar de columna o tablero.
- README final con capturas (`pnpm --filter @notnot/web capturas` las regenera con datos de ejemplo que después borra).
- e2e: la PWA contra el build de producción servido en local (manifest, íconos, service worker controlando la página y **sin errores de instalabilidad según Chrome**, vía CDP), la API no pasa por el fallback del SW, mobile en 375 px (captura una nota con el botón enviar y mueve la tarjeta con "Mover a…"), selector de tablero, atajo "Nueva nota" y banner sin conexión.

## Decisiones

- **Versiones**: lo último estable que funciona junto. TypeScript 6.0 (typescript-eslint todavía no soporta TS 7), Prisma 7.10 (Prisma 8 está en RC), React Router 8 en modo data, Vite 8, Vitest 5, ESLint 10, Tailwind 4, Zod 4, shadcn CLI 4.
- **Prisma 7 + Neon** (guía actual): la URL ya no va en `schema.prisma`. `prisma.config.ts` usa `DIRECT_URL` para el CLI y la app usa `DATABASE_URL` (pooled) con `@prisma/adapter-neon`. Prisma 7 no carga el `.env` solo: `prisma.config.ts` carga el `.env` de la raíz con `process.loadEnvFile`. El cliente se genera en `apps/api/src/generated` (no se commitea; sale en el `postinstall`).
- **`.env` único en la raíz** del repo, con `.env.example` al lado.
- **IDs**: UUID v7 (`@db.Uuid`).
- **Invariante `Task.columnId ∈ Task.boardId` en la base**: FK compuesta `Task(columnId, boardId) → Column(id, boardId)`, con `NoAction` para que borrar un tablero en cascada no choque.
- **Orden (`position`)**: claves de `fractional-indexing` comparadas por código de carácter (`comparePositions`). La base de Neon usa collation `C.UTF-8`, así que `ORDER BY position` también ordena bien.
- **`shared` se consume como TypeScript** (`exports` → `src/index.ts`), sin build propio: Vite lo transpila, la API en dev corre con `tsx` y para producción se empaqueta con esbuild en un solo `.mjs` (con `shared` y el cliente de Prisma adentro).
- **Dev de la API con `node --watch --import tsx`**: `tsx watch` se cuelga en Windows bajo `pnpm --parallel`.
- **Candado**: el código se compara sin mayúsculas, acentos ni espacios de más (en el celu el teclado los mete solo). El rate limit cuenta solo intentos fallidos y vive en memoria de cada instancia (en serverless es aproximado, como dice la spec).
- **Inbox**: no se renombra, archiva ni borra; el color sí se puede cambiar.
- **Diseño**: base neutra fría que sigue al sistema (claro/oscuro sin selector) y el color del tablero como único acento (punto en la sidebar, marca del tablero activo). Tipografía Instrument Sans, servida desde el bundle (Fontsource) para que la PWA no dependa de Google Fonts.
- **Deploy con la Build Output API de Vercel**: `pnpm build:vercel` genera el cliente de Prisma (Vercel restaura `node_modules` de la caché y pnpm no vuelve a correr el `postinstall`), corre `prisma migrate deploy`, el seed (crea Inbox si no existe), el build y `scripts/build-vercel.mjs`, que arma `.vercel/output` con la web estática, la API como una función (Node 24) y las rutas (`/api/*` → función, fallback de SPA, `noindex`, caché larga para `/assets`). Se descartó Vercel Services (beta) y el builder de Express (no empaqueta y el monorepo con `shared` en TS le complica la resolución).
- **Vercel**: `ENABLE_EXPERIMENTAL_COREPACK=1` para usar exactamente pnpm 11. Preview usa Neon `dev` y Production, Neon `production` (el branch principal). Las migraciones de cada entorno corren en su build. El repo está conectado a Vercel: cada push a `main` despliega a producción y cada rama tiene su preview.
- **e2e y rate limit**: el test del código incorrecto manda su propio `X-Forwarded-For` para no acumular intentos entre corridas locales.
- **Columnas nuevas**: si la de terminadas es la última, la nueva va justo antes (así "Hecho" queda al final); si no, al final. Cambiar cuál es la de terminadas actualiza `completedAt` de las tarjetas de las dos columnas. No se borra la de terminadas, una con tarjetas ni la última normal (409 con el motivo; la UI deshabilita la opción y explica por qué).
- **`move`**: valida que `prevId` y `nextId` sean vecinos reales en la columna destino; si no, 409 (el cliente tenía una vista vieja: vuelve atrás y refresca). Sin vecinos, va al final. El cliente calcula la misma posición con el mismo helper de `shared` para el update optimista.
- **dnd-kit**: `@dnd-kit/core` + `@dnd-kit/sortable` (estables) en vez de `@dnd-kit/react` (todavía 0.x). Mouse arrastra a partir de 5 px; touch con long-press de 250 ms (un toque abre la tarjeta y el scroll sigue andando); teclado con espacio y flechas, Enter abre la tarjeta.
- **Detalle de tarjeta en la URL** (`/b/:slug?tarjeta=<id>`): sirve para abrirla desde el panel de notas en la Fase 3. "Mover a" desde el detalle la deja al final de la columna elegida.
- **`toggle-done`** queda para la Fase 3, como dice la spec.
- **Parser**: los marcadores son exactamente los de la spec (`[]`, `[ ]`, `- []`, `- [ ]`, `* [ ]`; `* []` o `[x]` no cuentan). Solo la mención que se usa sale del título; las demás quedan como texto. Una mención es `@` al principio o después de un espacio (así un mail no cuenta), con letras, números y guiones. Si el título queda vacío o la línea era solo `[] @tablero`, es texto.
- **Notas**: el contenido se guarda sin espacios al principio y al final. Más de 50 tareas en una nota → 400. Las tareas de cada tablero destino van al final de su primera columna normal, en el orden de las líneas. Borrar un tablero también desvincula (`noteId`/`noteLine` en null) las tareas de otros tableros que salieron de sus notas.
- **Tachado**: una línea con marcador que ya no tiene tarea se muestra tachada (la tarjeta se borró). Si era una línea con marcador que nunca tuvo título (por ejemplo `[] @otro` con un tablero que después se borró), también se ve tachada: caso raro y sin consecuencias.
- **Autocompletado de `@`**: se cierra cuando lo escrito ya es un slug exacto, así Enter envía en vez de volver a elegir el tablero.
- **`noteBoardId`** en la respuesta de cada tarea: dice en qué tablero está la nota de origen, para el link "Ver la nota".
- **Panel de notas**: en desktop arranca abierto solo desde 1280 px si no hay preferencia guardada (en una tablet le come todo el lugar al tablero); el botón "Notas" del header lo abre o pliega y se recuerda. Las columnas miden 264 px para que entren tres al lado del panel en una pantalla de 1440.
- **PWA**: los íconos se generan con el CLI de `@vite-pwa/assets-generator` 1.x (la versión que acepta `vite-plugin-pwa` 1.3) y se commitean. El manifest usa el fondo claro como `theme_color`; en el HTML hay un `theme-color` por esquema (claro/oscuro). La API nunca se cachea y el fallback de la SPA excluye `/api/`.
- **Atajo "Nueva nota"**: apunta a `/?nueva-nota`; la redirección de `/` busca Inbox por `isInbox` (no por slug) y abre `/b/inbox?vista=notas&escribir=1`.
- **Vistas en la URL**: `?vista=notas` elige la pestaña Notas en mobile (y abre el panel en desktop), `?escribir=1` enfoca el composer, `?nota=<id>` resalta una nota y `?tarjeta=<id>` abre una tarjeta.
- **"Mover a…"**: en el detalle tiene su propio botón "Mover" (deja la tarjeta al final de la columna elegida); "Guardar" queda solo para título y descripción.
- **Bundle**: las dependencias van en un chunk aparte (`vendor`, ~200 kB gzip) y el código de la app en otro (~21 kB gzip): un deploy solo vuelve a bajar lo que cambió. El aviso de tamaño de Vite se subió a 700 kB porque el chunk de librerías es grande por naturaleza.
- **e2e de la PWA**: el proyecto `pwa` de Playwright hace `vite build` + `vite preview` (puerto 4173) y usa la API de dev a través del proxy de la preview.
- **Dev**: si corrés comandos de pnpm con la app levantada, pnpm 11 puede regenerar el cliente de Prisma y `node --watch` reinicia la API (algún pedido puede dar 502 en ese momento).

## Pendientes para vos

- **Instalarla en el celu y en la compu** (ver "Instalarla" en el README). El código de producción te lo pasé por chat; no está en el repo.
