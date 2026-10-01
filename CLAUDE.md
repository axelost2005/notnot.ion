<!-- Reglas personales de ahorro de tokens: en ~/.claude/CLAUDE.md, no acá. Los comentarios HTML no se cargan en el contexto. -->

# notnot.ion

App personal (un solo usuario, sin cuentas) para tareas por cliente: un tablero kanban por cliente o categoría + panel de notas rápidas donde cada línea que empieza con `[]` se vuelve tarjeta. Web + PWA para celu y compu.

La spec (modelo, API, UI y fases) está en `docs/SPEC.md`. Leé la parte que toque antes de cada fase. La spec es el pedido: implementá lo que dice, ni más ni menos.

## Stack
Monorepo pnpm. **web**: React + TS + Vite + Tailwind + shadcn/ui + TanStack Query + React Router + dnd-kit + vite-plugin-pwa. **api**: Express 5 + TS + Prisma + Postgres (Neon). **shared**: schemas Zod, parser de notas, slug y orden. **tests**: Vitest + Supertest + Playwright.

## Comandos
- `pnpm dev`: web + api juntos (Vite proxea `/api`)
- `pnpm check`: lint + typecheck + tests. Tiene que pasar antes de cada commit.
- `pnpm e2e`: tests e2e con Playwright (headless) contra la app levantada. Va aparte de `pnpm check`.
- `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm build`
- `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:studio`

## Convenciones
- TypeScript estricto. Nada de `any`: `unknown` + narrowing.
- Tipos y schemas Zod viven en `packages/shared` y los usan web y api. No se duplican.
- Lógica pura (parser, slug, orden) va en `shared` y siempre con tests.
- API: un router por recurso en `routes/`, lógica y Prisma en `services/`. Toda entrada se valida con Zod. Errores: `{ error: { code, message } }`.
- Web: código por feature en `src/features/<feature>/`. Datos del server solo con TanStack Query.
- Responsive siempre: nada se rompe en 375px (el layout mobile completo llega en la Fase 4).
- Código, nombres y commits en inglés. UI y docs en español.
- Dependencias nuevas solo si hacen falta; el porqué va en el commit.

## Ojo con
- Candado: toda ruta `/api/*` pasa por el middleware salvo `/api/health` y `/api/unlock`. Ninguna ruta nueva devuelve datos sin cookie.
- Web y API en el mismo origen (proxy en dev, rewrite en prod). Nada de CORS ni cookies cross-site.
- `position` usa fractional indexing: mover una tarjeta actualiza solo esa fila.
- Prisma + Neon: URL pooled en runtime, directa para migraciones.
- `shared` se tiene que resolver bien en Vite, en el dev de la api y en el build de Vercel (clásico problema de monorepo).
- `.env` nunca se commitea. Variable nueva → `.env.example` y `apps/api/src/env.ts`.

## Flujo (modo autónomo)
- Hacé las fases de corrido, de la 0 a la 4, sin planes para aprobar ni confirmaciones entre fases.
- Frená solo por algo que no podés resolver vos (credenciales, login en una cuenta). Si se puede, anotalo como pendiente y seguí.
- Ante una duda, elegí lo más simple que cumpla la spec y anotalo en `docs/PROGRESO.md`. Si cambia algo de la spec, actualizá `docs/SPEC.md`.
- Verificá cada fase vos mismo antes de pasar a la siguiente: `pnpm check` y `pnpm build` en verde, y su "Listo cuando" probado con la app levantada (curl + `pnpm e2e`). Si algo falla, arreglalo; no me pidas que pruebe yo.
- Si un "Listo cuando" depende de mí (deploy, cuentas), probalo en local y dejalo como pendiente.
- Rama por fase (`feat/phase-N-nombre`; la Fase 0 va directo a `main`), commits chicos con Conventional Commits y merge a `main` al cerrar cada fase (PR con `gh` si está logueado).
- `docs/PROGRESO.md`: fase actual, lo hecho, decisiones y pendientes para mí. Actualizalo al cerrar cada fase y leelo primero si se corta la sesión.
- Si la spec choca con la doc actual de una librería, seguí la doc y anotalo.
- Al terminar todo: resumen corto con qué anda, qué quedó pendiente y qué tengo que hacer yo.
