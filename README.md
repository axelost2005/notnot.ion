# notnot.ion

App personal para organizar el laburo por cliente. A la izquierda, una barra con Hoy (lo de hoy de todos los clientes), Tareas, Finanzas y tus notas. Tareas es una grilla con un cuadrado por cliente, pintado según cómo viene (azul por hacer, amarillo en curso, verde al día), y cada cuadrado se abre encima con el tablero kanban del cliente y sus notas rápidas (cada línea que empieza con `[]` se vuelve tarjeta).

Un solo usuario, sin cuentas: la app se abre con un código. Funciona en la web y se instala como PWA en el celu y en la compu.

![Tareas: la barra, el campo para anotar y los cuadrados por estado](docs/capturas/escritorio-inicio.png)

| Oscuro                                              | Celu: Tareas                                          | Celu: menú                                            | Celu: tablero                                           |
| --------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| ![Modo oscuro](docs/capturas/escritorio-oscuro.png) | ![Tareas en el celu](docs/capturas/mobile-inicio.png) | ![La barra en el celu](docs/capturas/mobile-menu.png) | ![Tablero en el celu](docs/capturas/mobile-tablero.png) |

## Cómo se usa

- **Barra**: Hoy (con cuántas te quedan para hoy), Tareas (con las abiertas de todos los clientes), Finanzas (en rojo, lo que vence hoy o ya venció) y, debajo, tus notas.
- **Tareas**: arriba, "Anotar…"; abajo, un cuadrado por cliente. El color dice cómo viene y también lo dice al pie: azul "Por hacer" (tiene tareas y ninguna empezada), amarillo "En curso" (alguna está en una columna en curso) y verde "Al día" (no le queda ninguna). El color del cliente queda en el puntito al lado del nombre. Cada cuadrado muestra las abiertas (el número grande), hasta tres tareas, cuántas son para hoy (el sol) y cuántas tachaste hoy. Tocarlo lo abre encima: crece desde su lugar y, al cerrarlo (×, Esc o tocando afuera), vuelve ahí. Los tableros archivados quedan plegados abajo.
- **Anotar**: escribís la tarea y das Enter. Con `@tablero` va a ese cliente (sin `@`, a General); los chips eligen el día (Hoy, los próximos de la semana o "Sin día"). Pegando varias líneas se anota una tarea por línea. El mismo campo está en Hoy y en cada tablero (ahí, sin `@`, va a ese tablero).
- **Hoy**: lo que tenés que hacer hoy de todos los clientes, agrupado por cliente, con los próximos días al lado. El nombre de un cliente abre su tablero encima y, al cerrarlo, volvés a Hoy. Lo que no tachás pasa solo al día siguiente, marcado ("de ayer"). Una tarea va a Hoy con el sol de su tarjeta (o eligiendo el día en su detalle) y sale tocándolo de nuevo.
- **Tableros**: uno por cliente o categoría, con columnas "Por hacer", "En curso" y "Hecho" (podés agregar, renombrar y elegir cuál es la de terminadas). General guarda lo que no es de ningún cliente.
- **Tarjetas**: se tildan con su checkbox (igual que desde la nota) y se mueven arrastrando a cualquier parte de la columna (con el mouse, con espacio y flechas, o con un toque largo en el celu) o desde el detalle con "Mover a…". En el detalle también se elige el día.
- **Imágenes**: en el detalle de una tarjeta, pegá una captura (Ctrl+V), arrastrá una imagen o tocá "Adjuntar" (en el celu, galería o cámara). Se achican antes de subirse, se agrandan al tocarlas y son privadas: solo se ven con el candado abierto.
- **Notas del tablero**: en la pestaña "Notas" de cada tablero, escribís como en un chat. El composer ya arranca con `[] `: escribís, das Enter y se crea la tarjeta, listo para la siguiente. Cada línea que empieza con `[]`, `[ ]`, `- []`, `- [ ]` o `* [ ]` se vuelve tarjeta al final de "Por hacer"; para una nota común, borrás los corchetes. Con `@tablero` la mandás a otro tablero. Abajo del composer se ve antes de enviar: "2 tareas → Pepito, General".
- Tildar una línea de la nota manda la tarjeta a "Hecho"; moverla en el tablero actualiza el tilde. Borrar una nota deja sus tarjetas.
- **Notas en otra ventana**: el botón del encabezado del tablero las abre solas en una ventana chica, con un selector de tablero arriba, para tenerlas al costado en una reunión. En Windows, PowerToys la deja siempre encima con Win+Ctrl+T.
- **Historial**: cada día arranca con "Hecho" vacío. Lo terminado antes de hoy pasa al Historial, agrupado por día: el de cada tablero en su encabezado y el de todos en el encabezado de Tareas.
- **Sección Notas** (en la barra): para lo que no es una tarea. Carpetas con carpetas adentro y notas con título y texto, que se guardan solas mientras escribís. El "+" crea una nota o una carpeta, y la nota se abre al lado de la barra. Se crean, renombran, mueven ("Mover a…") y borran desde el "…" de cada una; las carpetas, además, se personalizan con un color y un ícono.
- **Finanzas → Cobrado**: los pagos que te hicieron, en pesos o dólares, organizados por mes. Cada uno con fecha, monto, cliente (uno de los tableros), categoría, descripción y comprobantes. Arriba, lo cobrado en el mes por moneda; la lista se ve por fecha o agrupada por categoría.
- **Finanzas → Por cobrar**: lo que te deben, con el día que vence. Lo vencido queda arriba y marcado, y Finanzas en la barra muestra cuántas vencen hoy o ya vencieron. "Me pagaron" anota el pago ya completo (si fue una parte, cambiás el monto y queda lo que falta); cuando está todo, pasa a "Cobradas" con la lista de sus pagos.
- **En el celu**: la barra se abre con el ☰ del encabezado y se cierra sola al elegir algo. Los cuadrados van de a dos y el tablero se abre a pantalla completa. El tablero es una lista, con las columnas una abajo de la otra. La tarjeta y los formularios se abren desde abajo, y todo se toca cómodo con el dedo.

![Un tablero abierto encima de Tareas](docs/capturas/escritorio-tablero.png)

![Hoy: lo de todos los clientes y los próximos días](docs/capturas/escritorio-hoy.png)

| Sección Notas                                           | Finanzas                                                |
| ------------------------------------------------------- | ------------------------------------------------------- |
| ![Una nota abierta](docs/capturas/escritorio-notas.png) | ![Pagos del mes](docs/capturas/escritorio-finanzas.png) |

![Por cobrar: lo vencido arriba, lo que falta y "Me pagaron"](docs/capturas/escritorio-por-cobrar.png)

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
pnpm db:seed           # crea el tablero General
pnpm dev               # web en http://localhost:5173 y API en :3001
```

En desarrollo, Vite manda `/api` a la API: web y API quedan en el mismo origen, igual que en producción. El código para entrar es el `APP_SECRET` del `.env`.

### Variables de entorno

| Variable                | Para qué                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Conexión pooled de Neon. La usa la app.                                                |
| `DIRECT_URL`            | Conexión directa de Neon. La usa Prisma para migrar.                                   |
| `APP_SECRET`            | El código del candado: una frase de 4 o más palabras.                                  |
| `SESSION_SECRET`        | Firma la cookie de sesión. Rotarlo cierra todas las sesiones.                          |
| `BLOB_READ_WRITE_TOKEN` | Store privado de Vercel Blob (imágenes y comprobantes). En local, el del store de dev. |

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
| `pnpm db:seed`                       | Crea General si no existe.                                               |
| `pnpm db:studio`                     | Abre Prisma Studio.                                                      |
| `pnpm --filter @notnot/web icons`    | Regenera los íconos de la PWA desde `apps/web/public/icon.svg`.          |
| `pnpm --filter @notnot/web capturas` | Regenera estas capturas (con la app levantada).                          |

## Deploy

Vercel sirve la web y la API en el mismo origen: `pnpm build:vercel` aplica las migraciones, crea General si no existe, hace el build y arma `.vercel/output` con la web estática y la API como una función (`/api/*`). La configuración está en `vercel.json` y `scripts/build-vercel.mjs`.

Neon tiene un branch `dev` para local y previews, y `production` (el principal) para producción. Las imágenes van a Vercel Blob privado, también separado: `notnot-ion-dev` para local y previews, `notnot-ion-prod` para producción. El repo está conectado a Vercel: cada push a `main` despliega a producción y cada rama tiene su preview.

## Instalarla

- **Compu (Chrome o Edge)**: "Instalar app" en la barra lateral, o el ícono de instalar en la barra de direcciones.
- **Android**: "Instalar app" en el menú de tableros, o "Agregar a la pantalla principal" desde el navegador.
- **iPhone**: en Safari, Compartir → "Agregar a inicio". La app instalada tiene su propio almacenamiento: puede pedirte el código otra vez.

Con la app instalada, tocar y mantener el ícono ofrece "Nueva nota": abre General listo para escribir.

## Documentación

- [`docs/SPEC.md`](docs/SPEC.md): qué hace la app, modelo, API, UI y fases.
- [`docs/PROGRESO.md`](docs/PROGRESO.md): en qué fase está, decisiones y pendientes.
