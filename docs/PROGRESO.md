# Progreso

## Fase actual

**Fase 2 — Kanban: cerrada.** Sigue la Fase 3 (notas → tareas).

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
- Deploy: config lista (`vercel.json` + `scripts/build-vercel.mjs`), proyecto `notnot-ion` en Vercel y **preview funcionando** contra Neon `dev`. Producción espera la base `main` (ver pendientes).

### Fase 2 — Kanban

- API: `POST /boards/:id/columns`, `PATCH`/`DELETE /columns/:id`, `POST /tasks`, `PATCH`/`DELETE /tasks/:id` y `POST /tasks/:id/move` (calcula `position` con los vecinos y actualiza solo esa fila; también mueve a otro tablero). Validaciones con tests.
- `shared`: schemas de columnas y tareas, y helpers de movimiento (`slotAt`, `isValidSlot`, `positionForSlot`) con tests.
- Web: columnas con título, contador, menú (renombrar, usar para terminadas, borrar) y "Agregar tarjeta" al pie; "Agregar columna"; tarjetas con indicador de descripción; detalle (título, descripción, mover a otro tablero o columna, borrar con confirmación).
- Drag & drop con dnd-kit: mouse, teclado (espacio + flechas, con anuncios en español para lectores de pantalla) y touch con long-press. Optimista: la tarjeta se mueve al toque y vuelve si la API dice que no.
- e2e (`apps/web/e2e/kanban.spec.ts`): crear tarjetas, mover dentro y entre columnas con mouse, recargar y mantener el orden; mover con teclado; detalle; columnas.

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
- **Deploy con la Build Output API de Vercel**: `pnpm build:vercel` corre `prisma migrate deploy`, el build y `scripts/build-vercel.mjs`, que arma `.vercel/output` con la web estática, la API como una función (Node 24) y las rutas (`/api/*` → función, fallback de SPA, `noindex`, caché larga para `/assets`). Se descartó Vercel Services (beta) y el builder de Express (no empaqueta y el monorepo con `shared` en TS le complica la resolución).
- **Vercel**: `ENABLE_EXPERIMENTAL_COREPACK=1` para usar exactamente pnpm 11. Preview usa Neon `dev`; Production va a usar Neon `main`. Las migraciones de cada entorno corren en su build.
- **e2e y rate limit**: el test del código incorrecto manda su propio `X-Forwarded-For` para no acumular intentos entre corridas locales.
- **Columnas nuevas**: si la de terminadas es la última, la nueva va justo antes (así "Hecho" queda al final); si no, al final. Cambiar cuál es la de terminadas actualiza `completedAt` de las tarjetas de las dos columnas. No se borra la de terminadas, una con tarjetas ni la última normal (409 con el motivo; la UI deshabilita la opción y explica por qué).
- **`move`**: valida que `prevId` y `nextId` sean vecinos reales en la columna destino; si no, 409 (el cliente tenía una vista vieja: vuelve atrás y refresca). Sin vecinos, va al final. El cliente calcula la misma posición con el mismo helper de `shared` para el update optimista.
- **dnd-kit**: `@dnd-kit/core` + `@dnd-kit/sortable` (estables) en vez de `@dnd-kit/react` (todavía 0.x). Mouse arrastra a partir de 5 px; touch con long-press de 250 ms (un toque abre la tarjeta y el scroll sigue andando); teclado con espacio y flechas, Enter abre la tarjeta.
- **Detalle de tarjeta en la URL** (`/b/:slug?tarjeta=<id>`): sirve para abrirla desde el panel de notas en la Fase 3. "Mover a" desde el detalle la deja al final de la columna elegida.
- **`toggle-done`** queda para la Fase 3, como dice la spec.
- **Dev**: si corrés comandos de pnpm con la app levantada, pnpm 11 puede regenerar el cliente de Prisma y `node --watch` reinicia la API (algún pedido puede dar 502 en ese momento).

## Pendientes para vos

- **Neon `main` para producción.** Hacen falta las dos connection strings del branch `main` (pooled y directa). Pasámelas o cargalas vos:

  ```bash
  vercel env add DATABASE_URL production   # la pooled (con -pooler)
  vercel env add DIRECT_URL production     # la directa
  vercel deploy --prod
  ```

  El build de producción aplica las migraciones en `main` antes de publicar. `APP_SECRET` y `SESSION_SECRET` de producción ya están cargados en Vercel (el código te lo paso por chat; no está en el repo).

- **Conectar el repo a Vercel** (opcional, después de lo anterior): `vercel git connect` para que cada push a `main` despliegue solo.
