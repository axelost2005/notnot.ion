# notnot.ion — Spec

## Qué es
App personal para organizar el laburo por cliente. La app abre en una grilla de cuadrados: Hoy, uno por cliente o categoría, Notas y Finanzas. Tocar un cuadrado lo abre encima: el tablero kanban del cliente con sus notas rápidas (escribís como en un chat con vos mismo y cada línea que empieza con `[]` se convierte en tarjeta), lo de hoy de todos los clientes, la sección Notas o Finanzas.

- Un solo usuario. Sin registro ni cuentas: solo un candado con código (ver "Candado").
- Web + PWA instalable en celu y compu. Sin tiendas.
- Los datos viven en la API: lo que anotás en el celu aparece en la compu. Sin tiempo real: se refresca al volver a la app.

## Conceptos
- **Tablero**: un cliente o categoría ("Pepito", "Personal"). Tiene nombre, slug para `@`, color, columnas, tarjetas y notas. Siempre existe **General** (no se renombra, archiva ni borra): guarda lo que no es de ningún cliente (lo que se anota sin `@`) y su cuadrado va después de los tableros.
- **Historial**: cada día arranca con la columna de terminadas vacía. Las tarjetas terminadas antes de hoy (medianoche del dispositivo) salen del tablero y quedan en el historial.
- **Columna**: por defecto "Por hacer", "En curso" y "Hecho". Exactamente una por tablero es la de terminadas (`isDone`, default "Hecho").
- **Tarjeta**: una tarea. Título, descripción opcional, columna, orden y día opcional (para Hoy). Puede venir de una nota.
- **Nota**: texto libre dentro de un tablero. Se crea, se lee y se borra; no se edita en el MVP.
- **Sección Notas**: aparte de los tableros, para guardar lo que no es una tarea. Carpetas (con carpetas adentro) y notas con título y texto, sueltas o en una carpeta. En el código son `Folder` y `Page`.
- **Finanzas**: los pagos que me hicieron (solo ingresos, en ARS o USD), con cliente (un tablero), categoría y comprobantes, para poder mostrar qué se pagó y qué no. En el código, `Payment`.
- **Por cobrar**: lo que me deben, con el día que vence, dentro de Finanzas. Lo que me van pagando de eso son pagos vinculados: lo que falta es el monto menos esos pagos. En el código, `Receivable`.
- **Hoy**: las tareas con día de todos los tableros ("llevar a la perra al veterinario" en General, "mandar el presupuesto" en Pepito). Una tarea va a Hoy con el sol o eligiendo el día; lo que no se tachó pasa solo al día siguiente. Hasta la Fase 9 eran cosas aparte (`DayItem`); desde la 10 son tareas.

## Modelo de datos
| Modelo | Campos |
|---|---|
| Board | id, name, slug (único), color, position, isGeneral, archivedAt?, createdAt, updatedAt |
| Column | id, boardId, name, position, isDone, createdAt, updatedAt |
| Task | id, boardId, columnId, title, description?, position, completedAt?, archivedAt?, day? (día), noteId?, noteLine?, createdAt, updatedAt |
| Note | id, boardId, content, createdAt |
| Image | id, taskId?, paymentId?, pathname, contentType, size, width, height, createdAt |
| Folder | id, parentId?, name, color?, icon?, createdAt, updatedAt |
| Page | id, folderId?, title, content, createdAt, updatedAt |
| Payment | id, date (día), amountCents, currency, boardId?, category?, description?, receivableId?, createdAt, updatedAt |
| Receivable | id, description, amountCents, currency, boardId?, dueDate? (día), note?, createdAt, updatedAt |

- Cada tablero tiene al menos 1 columna normal y exactamente 1 `isDone`.
- `Task.columnId` siempre pertenece a `Task.boardId`.
- `completedAt` se setea al entrar a la columna `isDone` y se limpia al salir.
- `archivedAt` se setea cuando una tarjeta terminada pasa al historial. Las archivadas no se ven en el kanban ni cuentan para las reglas de columnas (vecinos al mover, columna vacía). Destildarla desde su nota o moverla la vuelve al tablero.
- `position` es una clave de fractional indexing (string): mover actualiza solo la fila movida. Índices en las FKs y en `(columnId, position)`.
- Borrar un tablero borra en cascada columnas, tareas y notas. Borrar una nota deja sus tareas (`noteId` y `noteLine` en null).
- Slug: minúsculas, sin acentos, espacios → guiones ("Pepito Pérez" → `pepito-perez`). Si choca, `-2`, `-3`… Se regenera al renombrar.
- Color: paleta fija de 14.
- Límites: nombre de tablero 1–40, título 1–200, descripción ≤ 5000, nota 1–5000, máximo 50 tareas por nota, 20 imágenes por tarjeta (2000 px y 4 MB como mucho cada una).
- Sección Notas: sin `parentId`/`folderId`, en la raíz. Borrar una carpeta borra en cascada lo que tiene adentro. Una carpeta no puede ir dentro de sí misma (409). Carpeta 1–60 caracteres, con color (uno de los 14 de los tableros) e ícono (de una lista fija) opcionales; título de nota ≤ 200 (puede quedar vacío: "Sin título"); texto ≤ 50.000.
- Imágenes: el archivo vive en un store privado de Vercel Blob (`pathname`) y la fila en la base. Cada imagen es de una tarjeta o de un pago (un CHECK lo asegura). Borrar una tarjeta, un tablero o un pago borra sus imágenes (filas en cascada; los archivos los borra la API después).
- Pagos: monto en centavos (mayor a cero), moneda `ARS` o `USD`, fecha sin hora. Borrar el tablero cliente deja el pago sin cliente. Categoría ≤ 40 y descripción ≤ 1000 (vacías quedan en `null`); hasta 20 comprobantes por pago.
- Por cobrar: concepto 1–200, monto como el de los pagos, vence (día) y nota ≤ 1000 opcionales. Lo cobrado es la suma de sus pagos (`Payment.receivableId`), que van en su misma moneda (si no, 409); cuando cubren el monto, está cobrada. Borrarla deja sus pagos, sin el vínculo. Borrar el tablero cliente la deja sin cliente.
- Hoy: `Task.day` es el día para el que es (sin hora). Lo pendiente de un día que ya pasó se ve en el de hoy; lo tachado antes de hoy pasa al historial como cualquier tarjeta. "Anotar…" acepta hasta 50 tareas por vez (una por línea).

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
REST + JSON bajo `/api`. Toda entrada se valida con los schemas de `shared`. Errores: `{ error: { code, message } }` con 400, 401, 404, 409 o 413 (cuerpo demasiado grande) según corresponda.

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
| POST | `/tasks` | Nueva tarea: `{ columnId, title, description?, day? }` |
| PATCH / DELETE | `/tasks/:id` | Editar (`title`, `description`, `day`; `day: null` la saca de Hoy) / borrar |
| POST | `/tasks/:id/move` | `{ columnId, boardId?, prevId?, nextId? }`: vecinos de arriba y abajo en el lugar nuevo; la API calcula `position` |
| POST | `/tasks/:id/toggle-done` | A la columna `isDone` o de vuelta a la primera columna normal |
| GET | `/boards/:id/notes?before=` | 50 notas por página, cada una con sus tareas |
| POST | `/notes` | `{ boardId, content }` → nota + tareas |
| DELETE | `/notes/:id` | Borra la nota; las tareas quedan |
| GET | `/overview` | Columnas y tarjetas (sin archivar) de todos los tableros activos: los cuadrados del Inicio y Hoy |
| GET | `/history?boardId=&before=` | Tarjetas del historial, de la más nueva a la más vieja, 50 por página. Sin `boardId`, las de todos los tableros |
| POST | `/tasks/:id/images?width=&height=` | Sube una imagen (el cuerpo es el archivo: WebP, JPEG o PNG, hasta 4 MB) y devuelve `{ id, width, height }` |
| GET | `/images/:id` | La imagen, con `Cache-Control: private, max-age=31536000, immutable` |
| DELETE | `/images/:id` | Borra la imagen y su archivo |
| GET | `/folders` | El árbol de la sección Notas: `{ folders, pages }` (las notas sin el texto) |
| POST | `/folders` | `{ name, parentId? }` |
| PATCH / DELETE | `/folders/:id` | Renombrar, mover (`parentId`), color o ícono (`null` vuelve a como estaba) / borrar con lo de adentro |
| POST | `/pages` | `{ title?, folderId? }` |
| GET / PATCH / DELETE | `/pages/:id` | Una nota con su texto / guardar título, texto o carpeta / borrar |
| GET | `/payments?month=2026-10` | Los pagos de un mes, del más nuevo al más viejo, con sus comprobantes |
| GET | `/payments/summary` | Los meses con pagos (y cuántos) y las categorías ya usadas |
| POST | `/payments` | `{ date, amountCents, currency, boardId?, category?, description?, receivableId? }` |
| PATCH / DELETE | `/payments/:id` | Editar / borrar (con sus comprobantes) |
| POST | `/payments/:id/images?width=&height=` | Sube un comprobante (igual que las imágenes de las tarjetas) |
| GET | `/receivables` | Todo lo por cobrar (pendiente y cobrado), cada una con lo cobrado y sus pagos |
| POST | `/receivables` | `{ description, amountCents, currency, boardId?, dueDate?, note? }` |
| PATCH / DELETE | `/receivables/:id` | Editar / borrar (sus pagos quedan) |

La web manda en cada pedido `X-Day-Start` con la medianoche de hoy en el dispositivo (ISO). Al leer un tablero, lo del Inicio (`/overview`), notas o historial, la API pasa al historial las terminadas antes de esa hora. Sin el header (o si está a más de 48 h de la hora del server) no archiva nada: no hace falta ninguna tarea programada.

## UI
- Rutas: `/unlock`, `/` (el Inicio), `/hoy`, `/b/:slug` (la web resuelve slug → id con la lista de tableros), `/p` (la sección Notas), `/p/:id` (una nota de la sección Notas), `/finanzas/:mes` (`/finanzas` abre el mes actual), `/finanzas/por-cobrar` y `/notas/:slug` (la ventana de notas). Todas menos `/unlock` y la ventana de notas son el Inicio con un panel abierto encima; un link directo abre el Inicio con su panel. `/?nueva-nota` (el atajo de la app instalada) abre las notas de General.
- **Inicio** (`/`): arriba, la barra con la marca, "Nuevo tablero", "Historial" (el de todos los tableros), "Instalar app" (si se puede) y "Bloquear"; abajo, "Anotar…" y la grilla de cuadrados: Hoy, un cuadrado por tablero activo en su orden (General al final), Notas y Finanzas. Los archivados van plegados abajo ("Archivados (n)"). La grilla se acomoda al ancho (de a dos en el celu).
  - Cuadrado de un tablero, teñido con su color: nombre, cuántas son para hoy (el sol), hasta tres tareas (primero lo que está en curso, después lo de hoy), las abiertas como número grande y las tachadas hoy. Hoy: la fecha, hasta cuatro de hoy con el punto de su tablero y cuántas quedan. Notas: las últimas editadas y cuántas hay. Finanzas: lo por cobrar (lo vencido en rojo, con cuántas vencieron) y el total.
  - "Anotar…": una tarea por línea; `@tablero` la manda ahí (sin `@`, a General) y los chips eligen el día (Hoy, los seis que siguen o "Sin día"; en el Inicio arranca en Hoy). Enter anota (Shift+Enter, salto de línea; con el dedo, el botón) y el cuadrado que la recibe late. El mismo campo está en Hoy y en cada tablero, donde sin `@` va a ese tablero y arranca en "Sin día".
- **Panel**: tocar un cuadrado lo abre encima: crece desde el cuadrado (GSAP Flip, 0,3 s) hasta un panel grande sobre el Inicio oscurecido (en el celu, la pantalla entera) teñido con su color, y al cerrarse (×, Esc, tocando afuera) vuelve al cuadrado; "atrás" del navegador también lo cierra. Con `prefers-reduced-motion`, solo un fundido. Adentro, cada sección tiene su encabezado con la ×.
- Sección Notas en su panel: en la compu, el árbol a la izquierda y la nota abierta a la derecha; en el celu, la lista o la nota (con "‹" para volver). El árbol: plegable (se recuerda qué carpetas están abiertas), carpetas primero y orden alfabético. "+" crea una nota o una carpeta; el "…" de cada fila tiene crear adentro (carpetas), renombrar, "Personalizar" (carpetas: color e ícono, con la fila como va a quedar), "Mover a…" y borrar. Sin elegir, una carpeta se ve gris con el ícono de carpeta. Una carpeta nueva queda lista para escribirle el nombre; una nota se renombra en su título. Borrar una carpeta vacía no pregunta; con contenido, pide confirmación y dice qué se lleva.
- Finanzas tiene dos pestañas: **Cobrado** (los pagos por mes) y **Por cobrar** (con cuántas hay pendientes).
- Cobrado (`/finanzas/2026-10`): el mes con flechas para ir y volver y la lista de los meses con pagos; lo cobrado en el mes por moneda; la lista por fecha o agrupada por categoría con subtotales (`?por=categoria`). "Anotar un pago" y tocar uno abren el mismo formulario: monto como se escribe acá ("150.000", "1.234,50"), moneda, fecha, cliente, categoría (con las ya usadas como sugerencia), descripción y comprobantes (pegar, arrastrar o adjuntar; en uno nuevo se suben al guardarlo). Si hay algo por cobrar, el formulario deja vincular el pago (o desvincularlo); vinculado, la moneda es la de lo que te deben.
- Por cobrar (`/finanzas/por-cobrar`): lo que te deben en total por moneda y la lista: primero lo vencido (marcado, "venció hace 3 días"), después lo que vence, por fecha ("vence hoy", "vence en 5 días"), y al final lo que no tiene fecha; las cobradas, aparte y plegadas. Cada fila: el día que vence, concepto, cliente, lo que falta (y de cuánto, si ya pagaron una parte) y "Me pagaron", que abre el formulario de un pago ya completo (lo que falta, la moneda, el cliente y el concepto) para ajustar el monto y adjuntar el comprobante. Tocar una abre su formulario: concepto, monto y moneda, vence, cliente, nota y los pagos que tiene.
- Nota (`/p/:id`): título y texto plano. Se guarda sola (un rato después de la última tecla, al ir a otra nota y al esconder la pestaña) y lo avisa ("Guardando…", "Guardado"). Arriba, dónde está (Notas / carpeta), "Mover a…" y borrar (después de borrarla, vuelve a la lista de notas). En el celu, "‹" vuelve a la lista de notas.
- Hoy (`/hoy`): la fecha, "Anotar…" (en Hoy) y dos columnas (una abajo de la otra en el celu): **Para hoy**, agrupado por tablero en el orden de los cuadrados (el nombre lleva a su tablero), con "Hechas hoy" plegado abajo; y **Próximos días**, cada día con algo ("Mañana · martes 6", "Jueves 8") con el tablero al lado de cada tarea.
  - Lo pendiente de días anteriores dice de cuándo viene ("de ayer", "del sábado"); lo que está en una columna "En curso" lo dice. Sin nada: "Nada para hoy" y cómo se agrega.
  - Cada tarea: checkbox (tilda como desde el tablero), el título (abre el detalle encima de Hoy) y el sol para sacarla de Hoy. El día se cambia desde el detalle.
- Panel del tablero: encabezado con el color y el nombre, "Tareas" / "Notas", "Desarchivar" si está archivado, "Historial" (las terminadas de ese tablero, agrupadas por día), el menú del tablero y, en la compu, "Abrir las notas en otra ventana". En Tareas, "Anotar…" y el kanban; en Notas, el panel de notas del tablero (en una columna de lectura). `?vista=notas` o `?nota=` abren Notas.
- Ventana de notas (`/notas/:slug`): una ventana chica aparte (`window.open`, ~400×640) con solo el panel de notas y un selector de tablero arriba (desplegable propio, con el punto de color de cada tablero). Cambiar de tablero cambia dónde se escriben las notas y a dónde van las tareas sin `@`. Lo que cambia en una ventana se refresca en las otras (BroadcastChannel).
- General es un tablero como los demás, con sus columnas (lo de todos los tableros juntos está en los cuadrados y en Hoy).
- Columna: título con el color de su rol (la primera normal celeste, las otras amarillas, la de terminadas verde), contador, "+ Agregar tarjeta" al pie y menú (renombrar, marcar como terminadas, borrar). Toda la columna recibe lo que se suelta.
- Tarjeta: una fila con un checkbox (tilda y destilda como desde la nota), el título (peso normal) con una línea de la descripción debajo y el sol: prendido si es de hoy (o de un día que pasó), apagado al pasar el mouse (con el dedo, siempre) y, si es para otro día, cuándo ("mañana", "jue 29"). Tocar el sol la manda a Hoy o la saca. Click abre el detalle (título, descripción, día, imágenes, mover a otro tablero o columna, borrar, link a la nota de origen). Las columnas miden lo que tienen adentro.
- Imágenes en el detalle: pegar (Ctrl+V), arrastrar o el botón "Adjuntar" (en el celu abre la galería o la cámara); el navegador las achica y las pasa a WebP antes de subirlas. Miniaturas que se borran (con confirmación) y que, al tocarlas, se agrandan desde su lugar (GSAP Flip, sin animación con `prefers-reduced-motion`) sobre el fondo oscurecido; se cierran con click, Esc o tocando afuera.
- Mobile (<768px): una sola columna de contenido, sin nada que se salga hacia los costados.
  - El Inicio es la navegación: los cuadrados de a dos y la barra de arriba con íconos. Cada panel ocupa la pantalla entera y se cierra con la ×.
  - En el tablero, "Tareas" / "Notas" van en una fila abajo del encabezado.
  - El tablero es una lista: cada columna es un grupo con su título (color de su rol, contador y menú, fijo arriba mientras se recorre el grupo), sus tarjetas como filas y "Agregar tarjeta" al final. En General, igual con sus tres columnas por estado.
  - Mover: long-press y arrastrar a otro grupo (cerca del borde de abajo o de arriba la lista se mueve sola), o "Mover a…" en el detalle.
  - Los diálogos (tarjeta, pago, por cobrar, tablero, carpeta…) suben desde abajo como hojas, a todo el ancho; las confirmaciones quedan centradas. El historial ocupa toda la pantalla. Abrir una tarjeta no despliega el teclado.
  - Con el dedo (`pointer: coarse`), botones, filas y opciones de menú miden 40–44 px. Los campos tienen 16 px de texto: con menos, el iPhone hace zoom al enfocarlos.
- Estética sobria y prolija tipo Linear, claro/oscuro según el sistema, color de acento por tablero. Estados vacíos y de carga cuidados. Toasts para errores.
- Accesible: drag & drop con teclado, labels en botones de ícono, foco visible.
- Datos con TanStack Query: refetch al volver a la app y optimistic updates al mover tarjetas, tildar y crear notas.

## PWA
- vite-plugin-pwa con `autoUpdate`. Manifest: name "notnot.ion", short_name "notnot", display standalone, colores de tema, íconos 192/512 + maskable, apple-touch-icon.
- Ícono: un SVG simple propio → PNGs con `@vite-pwa/assets-generator`.
- Shortcut del manifest "Nueva nota": abre el panel de General en Notas con el composer enfocado.
- Precache del shell; la API va siempre por red (sin offline en el MVP). Banner "Sin conexión" cuando no hay red.
- Botón "Instalar" cuando el browser lo permita; en iOS, tip "Compartir → Agregar a inicio".

## Deploy
- Vercel para web y API en el mismo origen (`/api/*` → Express). Elegí la config más simple que cumpla eso.
- Neon: branch `dev` para local y `production` (el principal) para prod. En prod, migraciones con `prisma migrate deploy`.
- Prisma según la guía actual de Prisma + Neon para serverless (URL pooled en runtime, directa para migraciones).
- Variables: `DATABASE_URL`, `DIRECT_URL` si Prisma la pide, `APP_SECRET`, `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`. Se validan con Zod al arrancar la API.
- Vercel Blob: store privado `notnot-ion-dev` para Development y Preview, `notnot-ion-prod` para Production (los dos en `iad1`, junto a Neon).
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

### Fase 7 — Por cobrar y carpetas personalizadas
Una rama y un PR por paso. Las migraciones solo agregan.

1. **Por cobrar.** En Finanzas, un lugar para anotar lo que me deben y cuándo me lo tienen que pagar.
   - Cada cosa: concepto ("Desarrollo web, segundo 50%"), monto y moneda, cliente (opcional), el día que vence (opcional) y una nota. En el código, `Receivable`.
   - Finanzas con dos pestañas: **Cobrado** (los pagos por mes, lo de la Fase 6) y **Por cobrar** (`/finanzas/por-cobrar`): lo que me deben en total por moneda y la lista, primero lo vencido (marcado), después lo que vence por fecha y al final lo que no tiene fecha. Las cobradas, aparte y plegadas.
   - "Me pagaron" abre el formulario de un pago ya completo para ajustar el monto (si pagaron una parte) y adjuntar el comprobante. El pago queda en Cobrado, vinculado: lo que falta es el monto menos sus pagos y, en cero, pasa a las cobradas con la lista de sus pagos. Desde el formulario de un pago también se vincula o desvincula.
   - En la sidebar, al lado de Finanzas, cuántas vencen hoy o ya vencieron.
   - Sin avisos (notificaciones) ni tiendas: la lista y el número alcanzan, y la app se instala desde el navegador.

   **Listo cuando:** el e2e anota una vencida con cliente y otra sin fecha; ve el total por moneda, la vencida primero y marcada, y el número en la sidebar; con "Me pagaron" registra una parte (queda lo que falta y el pago aparece en Cobrado del mes) y después el resto (pasa a las cobradas con sus dos pagos); vincula un pago anotado aparte; edita la otra y la borra.

2. **Carpetas personalizadas.** En la sección Notas, cada carpeta puede tener uno de los 14 colores de los tableros y un ícono de una lista; sin elegir, queda como ahora. Se cambian desde su "…" → "Personalizar", con una vista previa.

   **Listo cuando:** el e2e le pone color e ícono a una carpeta, recarga y siguen; y la vuelve a dejar como estaba.

### Fase 8 — Versión mobile
En el celu la app se veía como la de la compu achicada (el kanban con la columna siguiente asomando, el menú escondido en el título, diálogos centrados). Pasa a ser una versión pensada para el celu, más ordenada (ver "Mobile" en UI). La compu queda igual.

- Tablero y General como lista vertical agrupada por columna, con el título del grupo fijo arriba.
- Barra de abajo con Tablero, Notas, Finanzas y Menú. "Notas" es la sección Notas (carpetas y notas) para usar el celu de anotador rápido; las notas del tablero, que se usan más en la compu, quedan en un botón del header del tablero.
- Diálogos como hojas desde abajo; historial a pantalla completa.
- Tamaños para el dedo y campos de 16 px.

**Listo cuando:** el e2e en 375 px ve las columnas una abajo de la otra a todo el ancho sin scroll horizontal; con la barra de abajo va a la sección Notas, a Finanzas, vuelve al tablero y abre el menú; desde "Notas" crea una nota con "Nueva nota" (el título ya enfocado) y la ve en la lista al volver; abre las notas del tablero desde su header, captura una nota y mueve una tarjeta con "Mover a…"; con long-press baja una tarjeta hasta "En curso" en un tablero y en General; y desde una nota de la sección Notas, "Menú" abre la sidebar.

### Fase 9 — Hoy
Una lista de cosas generales para hacer, por día, que no son tareas de un cliente (ver "Hoy" en Conceptos y en UI). Una rama y un PR. La migración solo agrega una tabla.

- Modelo `DayItem` y `GET/POST /day-items`, `PATCH/DELETE /day-items/:id`.
- En `shared`, con tests: separar lo pegado en una cosa por línea y agrupar por día (lo pendiente de días anteriores va en Hoy).
- Pantalla `/hoy`; "Hoy" arriba de todo en la sidebar y primero en la barra de abajo del celu, con cuántas quedan para hoy.
- Sin ver días pasados, sin reordenar y sin `@cliente` (quedan en "Después").

**Listo cuando:** el e2e anota una cosa con Enter y pega dos líneas (quedan 3 para hoy), con el chip "Mañana" anota otra, ve 3 en la sidebar, tacha una y el número baja a 2, edita una y pasa otra a mañana; con el reloj del navegador en mañana, la tachada ya no está y lo pendiente de ayer aparece en Hoy con "de ayer"; borra una. En 375 px llega desde la barra de abajo y anota sin scroll horizontal.

### Fase 10 — Inicio en cuadrados
La app tenía todo pero desordenado: cinco lugares para anotar una tarea, tres para verlas (Hoy, General y cada tablero) y lo de Hoy no se cruzaba con las tareas de los clientes. Elegiste la propuesta de cuadrados con el panel "que se abre encima" (ver "Inicio" en UI). Una rama y un PR.

- **Inicio** (`/`): el campo para anotar arriba y una grilla de cuadrados: Hoy, un cuadrado por tablero activo (General al final), Notas y Finanzas. Se van la sidebar, la barra de abajo del celu y el kanban de General con lo de todos.
- **Cada cuadrado resume**: abiertas (el número grande), hasta tres tareas (en curso primero, después las de hoy), cuántas son para hoy (el sol) y cuántas se tacharon hoy.
- **Tocar un cuadrado lo abre encima**: crece desde su lugar hasta un panel grande (en el celu, la pantalla entera) con GSAP Flip en unos 0,3 s, y vuelve a su lugar al cerrarse (×, Esc, tocar afuera o "atrás"). Adentro, lo de siempre: el kanban y las notas del tablero, Hoy, la sección Notas o Finanzas. Las rutas no cambian (`/b/:slug`, `/hoy`, `/p`, `/finanzas`…): un link directo abre el Inicio con el panel abierto.
- **Tareas con día**: `Task.day` (opcional). El sol de cada tarea la manda a Hoy o la saca, y el detalle deja elegir el día. Hoy junta las de todos los tableros; lo que no se tacha pasa solo al día siguiente, como antes.
- **Lo de Hoy pasa a ser tareas**: la migración convierte cada cosa de Hoy en una tarea de General con su día (lo tachado, en "Hecho") y borra la tabla `DayItem` y `/day-items`.
- **Un campo para anotar**: en el Inicio y en Hoy, con `@tablero` (sin `@`, a General) y chips de día; dentro de un tablero, va a ese tablero. Una tarea por línea.
- **Más compacto**: tarjetas con el título en peso normal y columnas del alto de lo que tienen.

**Listo cuando:** el e2e anota desde el Inicio "algo @tablero" para hoy y el cuadrado del tablero y el de Hoy lo cuentan; abre el cuadrado del tablero (el panel queda abierto en `/b/:slug`), ve la tarea con el sol prendido, la tacha y el cuadrado suma una tachada; con Esc vuelve al Inicio; abre Hoy y ve la tarea de un tablero y una de General; manda una tarea a mañana desde el detalle y aparece en "Próximos días"; con el reloj del navegador en mañana, lo pendiente de ayer está en Hoy con "de ayer"; abre Notas y Finanzas desde sus cuadrados; un link directo a `/b/:slug` abre el panel. En 375 px, la grilla va de a dos, el panel ocupa la pantalla y no hay scroll horizontal. La migración, probada con datos de Hoy pendientes y tachados, deja las tareas en General con su día.

## Después (no ahora)
- Hoy: ver los días pasados y reordenar arrastrando.
- Avisos de lo que vence por cobrar (notificaciones push con la app instalada).
- IA para procesar notas desordenadas (Claude API desde la API, con confirmación antes de crear).
- Fechas y recordatorios ("mañana", "viernes").
- Búsqueda, filtros, etiquetas y prioridad.
- Offline completo y tiempo real entre dispositivos.
- Link de solo lectura para que un cliente vea su tablero.
- Atajos de teclado, editar notas, reordenar tableros.
