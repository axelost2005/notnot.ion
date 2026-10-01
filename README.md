# notnot.ion

App personal para organizar el laburo por cliente. Cada cliente o categoría tiene su tablero kanban y, al lado, un panel de notas rápidas: escribís como en un chat con vos mismo y cada línea que empieza con `[]` se convierte en tarjeta.

Un solo usuario, sin cuentas: la app se abre con un código. Funciona en la web y se instala como PWA en el celu y en la compu.

![Tablero con el panel de notas](docs/capturas/escritorio-claro.png)

| Oscuro                                              | Celu: tablero                                           | Celu: notas                                         |
| --------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| ![Modo oscuro](docs/capturas/escritorio-oscuro.png) | ![Tablero en el celu](docs/capturas/mobile-tablero.png) | ![Notas en el celu](docs/capturas/mobile-notas.png) |

## Cómo se usa

- **Tableros**: uno por cliente o categoría, con columnas "Por hacer", "En curso" y "Hecho" (podés agregar, renombrar y elegir cuál es la de terminadas). Inbox siempre está, para lo que no es de nadie.
- **Tarjetas**: se crean al pie de cada columna y se mueven arrastrando (con el mouse, con espacio y flechas, o con un toque largo en el celu) o desde el detalle con "Mover a…".
- **Notas**: escribís en el panel de la derecha (en el celu, en la pestaña "Notas"). Cada línea que empieza con `[]`, `[ ]`, `- []`, `- [ ]` o `* [ ]` se vuelve tarjeta al final de "Por hacer". Con `@tablero` la mandás a otro tablero; sin `@`, queda en el tablero donde escribís. Abajo del composer se ve antes de enviar: "2 tareas → Pepito, Inbox".
- Tildar una línea de la nota manda la tarjeta a "Hecho"; moverla en el tablero actualiza el tilde. Borrar una nota deja sus tarjetas.

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

En desarrollo, Vite manda `/api` a la API: web y API quedan en el mismo origen, igual que en producción. El código para entrar es el `APP_SECRET` del `.env`.

### Variables de entorno

| Variable         | Para qué                                                      |
| ---------------- | ------------------------------------------------------------- |
| `DATABASE_URL`   | Conexión pooled de Neon. La usa la app.                       |
| `DIRECT_URL`     | Conexión directa de Neon. La usa Prisma para migrar.          |
| `APP_SECRET`     | El código del candado: una frase de 4 o más palabras.         |
| `SESSION_SECRET` | Firma la cookie de sesión. Rotarlo cierra todas las sesiones. |

## Scripts

| Comando                              | Qué hace                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `pnpm dev`                           | Levanta web y API juntas.                                                |
| `pnpm check`                         | Lint, typecheck y tests. Tiene que pasar antes de cada commit.           |
| `pnpm build`                         | Build de producción de la web y bundle de la API.                        |
| `pnpm e2e`                           | Tests e2e con Playwright (incluye la PWA contra el build de producción). |
| `pnpm test`                          | Tests unitarios (Vitest).                                                |
| `pnpm lint`                          | ESLint y Prettier.                                                       |
| `pnpm typecheck`                     | TypeScript en todos los paquetes.                                        |
| `pnpm format`                        | Formatea todo con Prettier.                                              |
| `pnpm db:migrate`                    | Crea y aplica migraciones (Prisma).                                      |
| `pnpm db:seed`                       | Crea Inbox si no existe.                                                 |
| `pnpm db:studio`                     | Abre Prisma Studio.                                                      |
| `pnpm --filter @notnot/web icons`    | Regenera los íconos de la PWA desde `apps/web/public/icon.svg`.          |
| `pnpm --filter @notnot/web capturas` | Regenera estas capturas (con la app levantada).                          |

## Deploy

Vercel sirve la web y la API en el mismo origen: `pnpm build:vercel` aplica las migraciones, crea Inbox si no existe, hace el build y arma `.vercel/output` con la web estática y la API como una función (`/api/*`). La configuración está en `vercel.json` y `scripts/build-vercel.mjs`.

Neon tiene un branch `dev` para local y previews, y `production` (el principal) para producción. El repo está conectado a Vercel: cada push a `main` despliega a producción y cada rama tiene su preview.

## Instalarla

- **Compu (Chrome o Edge)**: "Instalar app" en la barra lateral, o el ícono de instalar en la barra de direcciones.
- **Android**: "Instalar app" en el menú de tableros, o "Agregar a la pantalla principal" desde el navegador.
- **iPhone**: en Safari, Compartir → "Agregar a inicio". La app instalada tiene su propio almacenamiento: puede pedirte el código otra vez.

Con la app instalada, tocar y mantener el ícono ofrece "Nueva nota": abre Inbox listo para escribir.

## Documentación

- [`docs/SPEC.md`](docs/SPEC.md): qué hace la app, modelo, API, UI y fases.
- [`docs/PROGRESO.md`](docs/PROGRESO.md): en qué fase está, decisiones y pendientes.
