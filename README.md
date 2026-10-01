# notnot.ion

App personal para organizar el laburo por cliente. Cada cliente o categoría tiene su tablero kanban y, al lado, un panel de notas rápidas: escribís como en un chat con vos mismo y cada línea que empieza con `[]` se convierte en tarjeta.

Un solo usuario, sin cuentas: la app se abre con un código. Funciona en la web y se instala como PWA en el celu y en la compu.

## Stack

Monorepo con pnpm:

| Paquete           | Qué tiene                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `apps/web`        | React + TypeScript + Vite, Tailwind, shadcn/ui, TanStack Query, React Router, dnd-kit y PWA. |
| `apps/api`        | Express 5 + TypeScript, Prisma y Postgres (Neon).                                            |
| `packages/shared` | Schemas Zod, parser de notas, slugs y orden (fractional indexing).                           |

Tests con Vitest y Supertest; e2e con Playwright.

## Cómo correrlo

Necesitás Node 24 (está en `.nvmrc`) y pnpm.

```bash
pnpm install
cp .env.example .env   # completá las variables (ver abajo)
pnpm db:migrate        # crea las tablas en la base
pnpm db:seed           # crea el tablero Inbox
pnpm dev               # web en http://localhost:5173 y API en :3001
```

En desarrollo, Vite manda `/api` a la API: web y API quedan en el mismo origen, igual que en producción.

### Variables de entorno

| Variable         | Para qué                                                      |
| ---------------- | ------------------------------------------------------------- |
| `DATABASE_URL`   | Conexión pooled de Neon. La usa la app.                       |
| `DIRECT_URL`     | Conexión directa de Neon. La usa Prisma para migrar.          |
| `APP_SECRET`     | El código del candado: una frase de 4 o más palabras.         |
| `SESSION_SECRET` | Firma la cookie de sesión. Rotarlo cierra todas las sesiones. |

## Scripts

| Comando           | Qué hace                                                       |
| ----------------- | -------------------------------------------------------------- |
| `pnpm dev`        | Levanta web y API juntas.                                      |
| `pnpm check`      | Lint, typecheck y tests. Tiene que pasar antes de cada commit. |
| `pnpm build`      | Build de producción de la web y bundle de la API.              |
| `pnpm e2e`        | Tests e2e con Playwright contra la app levantada.              |
| `pnpm test`       | Tests unitarios (Vitest).                                      |
| `pnpm lint`       | ESLint y Prettier.                                             |
| `pnpm typecheck`  | TypeScript en todos los paquetes.                              |
| `pnpm format`     | Formatea todo con Prettier.                                    |
| `pnpm db:migrate` | Crea y aplica migraciones (Prisma).                            |
| `pnpm db:seed`    | Crea Inbox si no existe.                                       |
| `pnpm db:studio`  | Abre Prisma Studio.                                            |

## Documentación

- [`docs/SPEC.md`](docs/SPEC.md): qué hace la app, modelo, API, UI y fases.
- [`docs/PROGRESO.md`](docs/PROGRESO.md): en qué fase está, decisiones y pendientes.
