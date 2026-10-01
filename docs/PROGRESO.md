# Progreso

## Fase actual

**Fase 0 — Cimientos: cerrada.** Sigue la Fase 1 (candado, tableros y primer deploy).

## Hecho

### Fase 0 — Cimientos

- Monorepo pnpm (`apps/web`, `apps/api`, `packages/shared`), TypeScript estricto, ESLint (type-aware) + Prettier, Vitest.
- `shared`: `slugify`, `uniqueSlug`, `normalizeForMatch`, helpers de orden (fractional indexing) y constantes (límites, paleta, columnas default). Con tests.
- API: Express 5 con `app.ts` (sin listen) y `server.ts`, `GET /api/health`, 404 y errores con formato `{ error: { code, message } }`, variables validadas con Zod en `env.ts`. Tests con Supertest.
- Prisma: modelo completo, migración inicial aplicada en Neon `dev` y seed idempotente de Inbox con sus 3 columnas.
- Web: Vite + React + Tailwind + shadcn/ui + React Router + TanStack Query. Home placeholder con "notnot.ion" y el estado de `/api/health`.
- `pnpm dev` levanta web y API; Vite proxea `/api`.
- Playwright (`pnpm e2e`) con el test de la home ("API ok").
- CI en GitHub Actions (`pnpm check` en cada push y PR), README y `.env.example`.

## Decisiones

- **Versiones**: se usó lo último estable que funciona junto. TypeScript 6.0 (typescript-eslint todavía no soporta TS 7), Prisma 7.10 (Prisma 8 está en RC), React Router 8 en modo data, Vite 8, Vitest 5, ESLint 10, Tailwind 4, Zod 4, shadcn CLI 4.
- **Prisma 7 + Neon** (según la guía actual): la URL ya no va en `schema.prisma`. `prisma.config.ts` usa `DIRECT_URL` para el CLI y la app usa `DATABASE_URL` (pooled) con `@prisma/adapter-neon`. Prisma 7 no carga el `.env` solo: `prisma.config.ts` carga el `.env` de la raíz con `process.loadEnvFile`. El cliente se genera en `apps/api/src/generated` (no se commitea; sale en el `postinstall`).
- **`.env` único en la raíz** del repo, con `.env.example` al lado.
- **IDs**: UUID v7 (`@db.Uuid`), ordenables por fecha de creación.
- **Invariante `Task.columnId ∈ Task.boardId` en la base**: FK compuesta `Task(columnId, boardId) → Column(id, boardId)`. Con `NoAction` (no `Restrict`) para que borrar un tablero en cascada no choque.
- **Orden (`position`)**: claves de `fractional-indexing` comparadas por código de carácter (`comparePositions` en `shared`). La base de Neon usa collation `C.UTF-8`, así que `ORDER BY position` también ordena bien.
- **`shared` se consume como TypeScript** (`exports` → `src/index.ts`), sin build propio: Vite lo transpila, la API en dev corre con `tsx` y para producción la API se empaqueta con esbuild (un solo `.mjs` con `shared` y Prisma adentro).
- **Dev de la API con `node --watch --import tsx`**: `tsx watch` se cuelga en Windows cuando corre bajo `pnpm --parallel`.
- **Deploy (Fase 1)**: Build Output API de Vercel. Un script arma `.vercel/output` con la web estática y la API como una función. Se descartó Vercel Services (está en beta) y el builder de Express (no empaqueta y el monorepo con `shared` en TS le complica la resolución).

## Pendientes para vos

- Nada por ahora.
