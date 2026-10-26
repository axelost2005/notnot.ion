# Fase 11 — Barra lateral y cuadrados por estado: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usá superpowers:executing-plans (recomendado acá) o superpowers:subagent-driven-development para implementar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** volver a la barra lateral (Hoy, Tareas, Finanzas y el árbol de Notas) y dejar los cuadrados solo para los tableros. Cada cuadrado se pinta según su estado (azul por hacer, amarillo en curso, verde al día) y conserva el punto del color del tablero.

**Arquitectura:**

- Un `AppLayout` nuevo envuelve todas las rutas con la barra. En el celu, la barra es una hoja que sale desde la izquierda.
- `/` es "Tareas": "Anotar…" y la grilla de cuadrados de los tableros.
  - Los cuadrados se siguen abriendo encima con el `Panel` de la Fase 10 (`/b/:slug` pasa a ser ruta hija de `/`).
- Hoy, Notas y Finanzas se ven al lado de la barra, sin panel.
- El estado de cada tablero sale de una función pura nueva en `shared` (`boardStatus`), con tests.

**Stack:** React 19, TS, Vite, Tailwind 4, Radix/shadcn, TanStack Query, React Router y GSAP Flip. `packages/shared` se prueba con Vitest y los e2e son de Playwright.

**Spec:** la sección "Diseño" de este documento; la tarea 4 la pasa a `docs/SPEC.md` como Fase 11. Para el resto valen `docs/SPEC.md` y `docs/PROGRESO.md`: leelos antes de empezar.

## Diseño

**El pedido** (resumido): le gustan los cuadrados por cliente.

- Quiere de vuelta la barra de la izquierda, con las Notas ahí.
- En la barra, un "espacio de tareas" que al tocarlo muestre todos los cuadrados.
- Los cuadrados no van con el color de cada tablero: de ese color queda solo el puntito.
- El color del cuadrado dice el estado: verde si están todas hechas, amarillo si están en proceso y azul si hay tareas por hacer.
- No sabía si pintar el borde o el cuadrado entero.

Lo que sigue, salvo esos puntos, son decisiones mías. Están marcadas con _(decisión)_ para revisarlas con quien hizo el pedido.

### Barra lateral (compu, ≥768 px)

Mide `w-60` y va fija a la izquierda.

- **Arriba:** la marca, que es un link a `/`.
- **Tres `NavLink`,** con el estilo de fila de la barra vieja:
  - **Hoy:** ícono `Sun` y cuántas quedan para hoy (`pendingTodayCount(overview.tasks, today)`).
  - **Tareas:** ícono `LayoutGrid` y la suma de `openTaskCount` de los tableros activos. Está activa en `/` y en `/b/:slug`.
  - **Finanzas:** ícono `Wallet` y lo vencido en rojo (`dueCount`).
- **Debajo, la sección Notas:** `<NotesSection onNavigate={…} />`, la variante de barra que ya existe ("Notas", el "+" y el árbol).
- **Abajo, fijos:** "Instalar app" (si se puede) y "Bloquear".
- **Scroll:** el cuerpo de la barra scrollea solo si el árbol es largo; el pie no se mueve.
- _(decisión)_ Hoy, Tareas y Finanzas van arriba de Notas para que un árbol largo no los empuje.

### Celu (<768 px)

- La misma barra se abre como hoja desde la izquierda (`Sheet`, `data-[side=left]:w-[min(20rem,85vw)]`). Elegir algo la cierra.
- _(decisión)_ La hoja se abre con un botón ☰ (`aria-label="Menú"`) al principio del encabezado de cada sección: Tareas, Hoy, la lista de Notas y Finanzas.
- _(decisión)_ No vuelve la barra de abajo de la Fase 8.
- Dentro de una nota (`/p/:id`), el encabezado sigue con "‹" (vuelve a la lista) y no lleva ☰.
- Los paneles de tablero siguen a pantalla completa, con su ×.

### Tareas (`/`)

- **Encabezado:** "Tareas", con "Historial" (el de todos los tableros) y "Nuevo tablero". _(decisión: es lo que estaba en la barra de arriba del Inicio.)_
- **Debajo, "Anotar…"** como ahora: arranca en Hoy.
- **La grilla:** un cuadrado por tablero activo, en su orden, con General al final. Ya no hay cuadrados de Hoy, Notas ni Finanzas.
- **Archivados:** plegados abajo, como ahora.
- **Al tocar un cuadrado** se abre encima como en la Fase 10: el mismo `Panel`, con 0,3 s al abrir y 0,24 s al cerrar.

### Hoy, Notas y Finanzas

Se ven en el área principal, al lado de la barra, sin panel ni animación.

- **Hoy (`/hoy`):** queda igual que ahora.
  - Tocar el nombre de un tablero abre su panel encima de Tareas, y al cerrarlo se vuelve a Hoy.
- **Notas:**
  - En la compu el árbol ya está en la barra. `/p` muestra un estado vacío ("Elegí una nota de la barra o creá una con el «+».") y `/p/:id` muestra la nota.
  - En el celu, `/p` sigue siendo la lista a pantalla completa, con "Nueva nota" a un toque.
- **Finanzas:** queda igual que ahora.

### Estado de un tablero (`boardStatus`, usa `laneOf`)

- **Al día** (verde, `--status-done`): no le queda ninguna tarea abierta.
  - _(decisión)_ Un tablero sin tareas también está al día. A la medianoche lo tachado pasa al historial, así que no se puede distinguir de un tablero que lo tachó todo ayer.
- **En curso** (amarillo, `--status-doing`): al menos una tarea abierta está en una columna "en curso", es decir cualquier columna normal que no sea la primera, como en `laneOf`. Este estado le gana a "por hacer".
- **Por hacer** (azul, `--status-todo`): tiene tareas abiertas y ninguna en curso.
- Los tres colores ya existen en `index.css`, en claro y oscuro: son los de los títulos de columna. No se agregan colores.

### Cómo se ve el cuadrado

- _(decisión: el pedido dudaba entre borde y relleno.)_ El fondo se tiñe con el color del estado (el mecanismo de ahora: `--tile` con `--tile-tint`) y el borde, del mismo color, va más marcado que hoy.
  - El borde arranca con 50 % de mezcla, y 75 % en hover. Se ajusta mirando capturas en claro y oscuro.
- El color del tablero queda solo en el punto al lado del nombre.
- _(decisión)_ El estado también se lee como texto (así no depende solo del color): una palabra visible, "Por hacer", "En curso" o "Al día", en la tinta del estado.
  - No se tiene que romper en 375 px con nombres largos.
- El resto del contenido se queda: el sol con las de hoy, hasta tres tareas, el número de abiertas y las tachadas hoy.
- **`aria-label` del cuadrado:** `"{nombre}: {estado}, {n} abierta|abiertas[, {m} para hoy]"`, con el estado en minúscula. Por ejemplo: `"Pepito: en curso, 4 abiertas, 2 para hoy"`.
- **`data-status`:** `"todo" | "doing" | "done"` en el link del cuadrado, para los e2e.
- _(decisión)_ El panel deja de teñirse con el color del tablero: queda con fondo y borde normales y el punto de color en su encabezado.

### Listo cuando (va a la Fase 11 de la spec)

**En la compu:**

- La barra muestra Hoy, Tareas, Finanzas y Notas, y en `/` solo hay cuadrados de tableros.
- El estado de un tablero cambia sin recargar:
  - sin tareas está "al día";
  - con una tarea anotada pasa a "por hacer";
  - al mover la tarea a "En curso" pasa a "en curso";
  - al tacharla vuelve a "al día".
- Un cuadrado abre su panel en `/b/:slug`, y Esc lo cierra y vuelve a la grilla.
- Hoy se abre desde la barra. El nombre de un tablero abre su panel, y al cerrarlo se vuelve a Hoy.
- El "+" de la barra crea una nota, que se ve en el área principal.
- Finanzas se abre desde la barra.

**En 375 px:**

- ☰ abre la barra, y elegir Hoy la cierra y muestra Hoy.
- La grilla va de a dos y no hay scroll horizontal.

## Global Constraints

- Mandan sobre este plan el `CLAUDE.md` de la raíz y `~/.claude/CLAUDE.md`.
- TypeScript estricto: sin `any`, `as any`, `@ts-ignore` ni `eslint-disable`.
- Código, nombres y commits en inglés, con Conventional Commits. UI y docs en español rioplatense.
- No hay dependencias nuevas ni cambios en la API o la base: esta fase no tiene migración.
- Nada se rompe en 375 px y no hay scroll horizontal.
- `pnpm check` y `pnpm build` en verde antes de cada commit.
- Se trabaja en la rama `feat/phase-11-sidebar`; al final, PR con `gh` y merge a `main`.
- `prefers-reduced-motion` no cambia: el panel solo hace un fundido.
- Nunca se imprime `APP_SECRET` ni nada del `.env`.
- `AGENTS.md` y `FI_8_Frameworks.pdf` son del usuario y no están trackeados: no se tocan.
- Se parte de lo que ya existe. La barra y el layout viejos están en git:
  - `git show 82ddbe6:apps/web/src/features/boards/Sidebar.tsx`
  - `git show 82ddbe6:apps/web/src/app/AppLayout.tsx`
  - De ahí se reusan las filas, la hoja del celu y los estados de carga y error. No se trae `dayItemsQuery` (ya no existe) ni la lista de tableros (ya no va en la barra).

## Cómo levantar la app sin la base de dev

Las credenciales de Neon dev siguen rotas, así que la API corre contra un Postgres en memoria (PGlite). El arnés de la sesión anterior está en:

`C:\Users\Usuario\AppData\Local\Temp\claude\c--Users-Usuario-Desktop-TRABAJO-DesarrolloWeb-notnot-ion\2dbe8b84-dd09-4614-8018-678f8235978e\scratchpad\harness`

Primero, leé su `README.md`. Después:

1. Corré `node start.mjs` desde esa carpeta, en segundo plano, y esperá a que imprima `HARNESS READY`. Deja la API en el puerto 3001 y lee `APP_SECRET` del `.env` sin mostrarlo.
2. Levantá solo la web: `pnpm --filter @notnot/web dev` (Vite en el 5173, que pasa `/api` al 3001). No uses `pnpm dev`, porque levanta la API real contra Neon y pisa el puerto.
3. Corré los e2e con `pnpm e2e`. Playwright reusa el server que ya está andando.
   - Conocidos: fallan `images.spec.ts` y el comprobante de `finance.spec.ts`, porque necesitan el token de Vercel Blob de dev.
4. Al terminar, corré `node stop.mjs` y pará Vite.

Si la carpeta ya no existe, armá uno igual en tu scratchpad siguiendo la decisión "PGlite" de `docs/PROGRESO.md`. Si no se puede, probá con `pnpm check` y `pnpm build`, y dejá los e2e como pendientes.

## Review Focus

1. **Nombre largo o muchos tableros en 375 px:** la palabra del estado y el sol no se pisan con el nombre ni se salen del cuadrado. Se mira en una captura de 375 px con un nombre de 40 caracteres (tarea 2, paso 6).
2. **Modo oscuro:** el azul y el verde se distinguen entre sí, y la palabra del estado tiene contraste. Se miran las capturas en oscuro (tarea 2, paso 6).
3. **El estado cambia sin recargar** al tachar o mover dentro del panel y cerrarlo (cache `['overview']`). Lo cubre el e2e de la tarea 2.
4. **Un panel que se abre desde fuera de la grilla,** sea desde Hoy o desde un link directo con la grilla todavía cargando: tiene que abrir bien y, al cerrarse, volver a Hoy o a `/`. Lo cubre el e2e de la tarea 3.
5. **La hoja del celu:**
   - abrir o crear una nota desde la hoja la cierra;
   - Esc cierra solo la hoja;
   - el foco vuelve al ☰.

   Lo cubre el e2e en 375 px de la tarea 3.

---

### Antes de la tarea 1

- [ ] `git switch -c feat/phase-11-sidebar` desde `main` (el árbol está limpio, salvo los dos archivos del usuario).
- [ ] `git add docs/superpowers/plans/2026-10-26-fase-11-barra-y-estado.md` y commit `docs: phase 11 plan`.

### Tarea 1: `boardStatus` en shared

**Files:**

- Modify: `packages/shared/src/general/lanes.ts` (ya se exporta desde `index.ts`)
- Test: `packages/shared/src/general/lanes.test.ts`

**Interfaces:**

- Produces: `boardStatus(boardColumns: readonly ColumnLike[], boardTasks: readonly { columnId: string; completedAt: string | null }[]): Lane`, que devuelve `'todo' | 'doing' | 'done'`.

- [ ] **Paso 1: tests que fallan** (`describe('boardStatus')`)

```ts
// Desordenadas a propósito: la primera es por posición.
const cols = [
  { id: 'hecho', position: 'a2', isDone: true },
  { id: 'curso', position: 'a1', isDone: false },
  { id: 'hacer', position: 'a0', isDone: false },
]
const task = (columnId: string, completedAt: string | null = null) => ({ columnId, completedAt })

it('sin tareas está al día', () => expect(boardStatus(cols, [])).toBe('done'))
it('todo tachado está al día', () =>
  expect(boardStatus(cols, [task('hecho', '2026-10-26T10:00:00.000Z')])).toBe('done'))
it('abiertas solo en la primera columna: por hacer', () =>
  expect(boardStatus(cols, [task('hacer'), task('hacer')])).toBe('todo'))
it('una en curso gana a las por hacer', () =>
  expect(boardStatus(cols, [task('hacer'), task('curso')])).toBe('doing'))
it('sin segunda columna normal nunca está en curso', () =>
  expect(
    boardStatus(
      [
        { id: 'hacer', position: 'a0', isDone: false },
        { id: 'hecho', position: 'a1', isDone: true },
      ],
      [task('hacer')],
    ),
  ).toBe('todo'))
it('una abierta de una columna que no está cuenta como por hacer', () =>
  expect(boardStatus(cols, [task('otra')])).toBe('todo'))
```

- [ ] **Paso 2:** correr `pnpm --filter @notnot/shared test`. Tiene que dar FAIL: `boardStatus` no existe.
- [ ] **Paso 3:** implementar `boardStatus` debajo de `laneOf`, con su comentario en español.
  - Una tarea está abierta si `completedAt === null`.
  - Si no hay abiertas, devuelve `'done'`. Si alguna abierta cae en `laneOf(...) === 'doing'`, devuelve `'doing'`. Si no, `'todo'`.
- [ ] **Paso 4:** correr el mismo comando. Tiene que dar PASS.
- [ ] **Paso 5:** `pnpm check` y commit `feat(shared): board status from its open tasks`.

### Tarea 2: cuadrados por estado y panel sin tinte

**Files:**

- Modify: `apps/web/src/features/home/Tiles.tsx`:
  - `Tile` acepta `status?: Lane` y pone `data-status`.
  - `BoardTile` pinta por estado, muestra la palabra y arma el `aria-label` nuevo.
  - El punto del tablero usa `boardStyle(board.color)` y `bg-(--board)`.
- Modify: `apps/web/src/features/home/Panel.tsx`: se va la prop `color`, el `--tile` y el `--panel-bg`. Queda `bg-background` con borde normal.
- Modify: `apps/web/src/features/home/HomeLayout.tsx`: `Section` y `sectionOf` sin `color`.
- Modify: `apps/web/src/index.css`: se borra `--panel-tint` en claro y en oscuro.
- Modify: `apps/web/src/features/kanban/LaneSection.tsx`: el encabezado fijo del celu pasa a `max-md:bg-background`.
- Test: `apps/web/e2e/home.spec.ts`

**Interfaces:**

- Consumes: `boardStatus` y `Lane` (de `@notnot/shared`).
- Produces:
  - `Panel` con props `{ tile, label, onClosed, children }`.
  - `const STATUS_LABEL: Record<Lane, string> = { todo: 'Por hacer', doing: 'En curso', done: 'Al día' }`, en `Tiles.tsx`.
  - El formato de `aria-label` y `data-status` de la sección Diseño.

- [ ] **Paso 1: e2e que falla:** `test('el color del cuadrado dice el estado')` en `home.spec.ts`. Crear el tablero como los otros tests del archivo y localizar el cuadrado con `getByRole('link', { name: new RegExp('^' + board.name + ':') })`. Después:
  - recién creado: `toHaveAttribute('data-status', 'done')` y el nombre contiene "al día";
  - anotar `e2e-… @slug` en "Anotar…": `'todo'`;
  - abrir el cuadrado, mover la tarjeta a "En curso" (como lo hace `kanban.spec.ts` o con "Mover a…" del detalle) y cerrar con Esc: `'doing'`;
  - abrirlo de nuevo, tacharla y cerrar con Esc: `'done'`.

  El label exacto del primer test cambia a `` `${board.name}: por hacer, 1 abierta, 1 para hoy` ``.

- [ ] **Paso 2:** `pnpm --filter @notnot/web e2e home.spec.ts`. Tiene que dar FAIL por `data-status`.
- [ ] **Paso 3:** implementar en `Tiles.tsx`:
  - en `BoardTile`, `status = boardStatus(columns, tasks)`;
  - `color` del `Tile` = `` `var(--status-${status})` `` (`Hoy` sigue con `--sun`, y Notas y Finanzas con gris hasta la tarea 3);
  - borde al 50 % de mezcla con `--border` y 75 % en hover;
  - la palabra y el `aria-label`.
- [ ] **Paso 4:** panel sin tinte: `Panel.tsx`, `HomeLayout.tsx`, `index.css` y `LaneSection.tsx`, según la lista de Files.
- [ ] **Paso 5:** `pnpm --filter @notnot/web e2e home.spec.ts` da PASS. Después, `pnpm check` y `pnpm build` en verde.
- [ ] **Paso 6: revisión visual** (Review Focus 1 y 2):
  - Con la app levantada, sacar capturas a 1280 y 375 px, en claro y en oscuro. Que haya tres tableros, uno en cada estado, y uno con un nombre de 40 caracteres.
  - Mirarlas. Si el azul y el verde se confunden o el texto se pisa, ajustar la mezcla del borde y del tinte o la ubicación de la palabra.
- [ ] **Paso 7:** commit `feat(web): tiles colored by board status, board color only on the dot`.

### Tarea 3: barra lateral, Tareas en `/` y secciones al lado

**Files:**

- Create: `apps/web/src/app/AppLayout.tsx`.
  - Lleva `OfflineBanner`, y abajo `<aside className="hidden w-60 shrink-0 border-r border-sidebar-border md:block"><Sidebar/></aside>` más `<main className="flex min-w-0 flex-1 flex-col"><Outlet/></main>`.
  - En el celu agrega el `Sheet` con `<Sidebar onNavigate={close}/>`.
  - Provee `MenuContext` con `() => setMenuOpen(true)`.
- Create: `apps/web/src/app/Sidebar.tsx`: `Sidebar({ onNavigate }: { onNavigate?: () => void })`, con el contenido de la sección Diseño.
- Modify: `apps/web/src/features/home/navigation.ts`:
  - agrega `export const MenuContext = createContext<(() => void) | null>(null)`;
  - el comentario de `FROM_HOME` pasa a decir "abierto desde la app: al cerrar, vuelve atrás hasta donde estaba".
- Rename + modify: `git mv apps/web/src/features/home/HomeLayout.tsx apps/web/src/features/home/TasksHome.tsx`.
  - Sin `TopBar`. Arriba, un `PanelHeader` con el ícono `LayoutGrid`, el h1 "Tareas", "Historial" y "Nuevo tablero", con los diálogos que estaban en `TopBar`.
  - Debajo, en su contenedor con scroll: "Anotar…", la grilla con solo `BoardTile` y los archivados.
  - `sectionOf` solo resuelve `/b/:slug`, y `onCreated` hace latir solo los cuadrados de tableros.
- Modify: `apps/web/src/features/home/Tiles.tsx`: se borran `TodayTile`, `NotesTile` y `FinanceTile`, y lo que quede sin uso.
- Modify: `apps/web/src/features/home/Panel.tsx`: `PanelHeader` suma la prop `menu?: boolean` (por defecto `true`).
  - Si no hay `PanelContext`, hay `MenuContext` y `menu` es true, pone al principio un ☰ `md:hidden` (`Button` ghost icon, ícono `Menu`, `aria-label="Menú"`, `aria-haspopup="dialog"`).
- Modify: `apps/web/src/app/router.tsx`, con el árbol de abajo.
- Modify: `apps/web/src/features/pages/NotesHome.tsx`: en la compu ya no lleva el árbol a la izquierda; muestra `PageView` o el estado vacío. El celu no cambia.
- Modify: `apps/web/src/features/pages/PageView.tsx`: los encabezados que tienen "‹" pasan `menu={false}`.
- Modify: `apps/web/src/features/today/TodayPanel.tsx`: los links a un tablero llevan `state={FROM_HOME}`.
- Test: `apps/web/e2e/home.spec.ts`.
- Modify, para que lleguen a Notas y Finanzas por la barra o por ☰:
  - `apps/web/e2e/mobile.spec.ts` (≈105–111)
  - `apps/web/e2e/pages.spec.ts` (≈164–182)
  - `apps/web/e2e/receivables.spec.ts` (≈79)
  - cualquier otro spec que falle por la navegación nueva

```tsx
// router.tsx, dentro de SessionGate
{ path: 'notas/:slug', Component: NotesWindow },
{
  Component: AppLayout,
  children: [
    { path: '/', Component: TasksHome, children: [
      { index: true, Component: NewNoteShortcut },
      { path: 'b/:slug', Component: BoardPage },
    ] },
    { path: 'hoy', Component: TodayPanel },
    { path: 'p', Component: NotesHome },
    { path: 'p/:id', Component: NotesHome },
    { path: 'finanzas', Component: FinanceRedirect },
    { path: 'finanzas/por-cobrar', Component: ReceivablesView },
    { path: 'finanzas/:month', Component: FinanceView },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
},
```

**Interfaces:**

- Consumes: `Panel` sin `color` (tarea 2).
- Produces:
  - `MenuContext`;
  - `PanelHeader({ children, className, close, menu })`;
  - `TasksHome`, `AppLayout` y `Sidebar`.

- [ ] **Paso 1: e2e que fallan, en `home.spec.ts`.** Reemplazan al test "Notas y Finanzas se abren desde su cuadrado…".
  - `test('la barra lleva a Hoy, Tareas, Finanzas y Notas')`, a 1280 px:
    - la barra tiene links Hoy, Tareas y Finanzas, y el árbol de Notas;
    - la lista "Cuadrados" no tiene links `/^(Hoy|Notas|Finanzas):/`;
    - Hoy navega a `/hoy` sin diálogo abierto;
    - el nombre del tablero en Hoy abre `dialog` con su nombre, y Esc vuelve a `/hoy`;
    - "+" y luego "Nota" en la barra va a `/p/:id`, con el título enfocado;
    - Finanzas va a `/finanzas/AAAA-MM`;
    - un link directo a `/b/:slug` abre el panel, y la × vuelve a `/`.
  - El test de 375 px de `home.spec.ts`:
    - ☰ abre `dialog` "Menú";
    - tocar Hoy lo cierra y muestra el encabezado "Hoy";
    - la grilla sigue de a dos (el chequeo de bounding boxes que ya está);
    - `scrollWidth <= clientWidth`.
  - Ajustar `mobile.spec.ts`, `pages.spec.ts` y `receivables.spec.ts` a la navegación nueva.
- [ ] **Paso 2:** `pnpm --filter @notnot/web e2e home.spec.ts mobile.spec.ts pages.spec.ts receivables.spec.ts`. Tiene que dar FAIL.
- [ ] **Paso 3:** `MenuContext` en `navigation.ts` y el ☰ en `PanelHeader`.
- [ ] **Paso 4:** `Sidebar.tsx` y `AppLayout.tsx`, partiendo de las versiones de `82ddbe6`.
- [ ] **Paso 5:** `TasksHome.tsx` (con `git mv`), la limpieza de `Tiles.tsx` y `router.tsx`.
- [ ] **Paso 6:** `NotesHome.tsx`, `PageView.tsx` y los links de `TodayPanel.tsx`.
- [ ] **Paso 7:** correr toda la suite con `pnpm e2e`. Tienen que pasar todos salvo los dos de Blob ya conocidos. Después, `pnpm check` y `pnpm build`.
- [ ] **Paso 8: revisión visual** (Review Focus 4 y 5):
  - Sacar capturas a 1280 y 375 px, en claro y en oscuro, de Tareas, Hoy, una nota, Finanzas, la hoja abierta y un panel de tablero.
  - Revisar alineación, overflow y foco visible en la barra.
- [ ] **Paso 9:** commit `feat(web): sidebar with Hoy, Tareas, Finanzas and notes; tiles only for boards`.

### Tarea 4: docs, capturas, PR y deploy

**Files:**

- Modify: `docs/SPEC.md`:
  - "Qué es".
  - UI: las rutas; "Inicio" pasa a "Barra" y "Tareas"; "Panel" (solo tableros y sin tinte); Hoy, Notas y Finanzas al lado; "Mobile" (☰ y la hoja).
  - Una sección nueva `### Fase 11 — Barra lateral y cuadrados por estado`, con el porqué (el pedido), los puntos y el "Listo cuando" de arriba.
- Modify: `docs/PROGRESO.md`:
  - La fase actual pasa a ser la 11.
  - "Hecho / Fase 11".
  - En "Decisiones", las marcadas _(decisión)_ en este plan.
  - En "Pendientes": probar en el celu y en la compu, y si el tinte o el borde se quedan cortos, decirlo (es un número). Los pendientes que siguen vigentes se quedan.
- Modify: `README.md`: "Cómo se usa" y las capturas.
- Modify: `apps/web/scripts/capturas.mjs`:
  - Salen los cuadrados de Hoy, Notas y Finanzas.
  - Los datos de ejemplo tienen tableros en los tres estados.
  - Se suma `mobile-menu.png`, con la hoja abierta.

- [ ] **Paso 1:** actualizar `SPEC.md`, `PROGRESO.md` y `README.md`.
- [ ] **Paso 2:** `pnpm --filter @notnot/web capturas` contra el arnés. Abrir y mirar cada captura antes de seguir.
- [ ] **Paso 3:** `pnpm check` y `pnpm build`, y commit `docs: phase 11 in the spec, progress log and README`.
- [ ] **Paso 4:** `git push -u origin feat/phase-11-sidebar` y `gh pr create`.
  - El cuerpo dice qué cambia, por qué y cómo se probó, y cierra con la línea de Claude Code.
- [ ] **Paso 5:** `gh pr checks --watch`.
  - El check de CI tiene que pasar.
  - El preview de Vercel puede fallar por `P1001`, igual que en los PR #20 y #21 (la base de dev): anotarlo en el PR y no bloquear por eso.
- [ ] **Paso 6:** `gh pr merge --merge`, después `git switch main && git pull`.
  - Cuando termine el deploy de `main`, `https://notnot-ion.vercel.app/api/health` tiene que dar 200 y `/api/overview` sin cookie, 401.
- [ ] **Paso 7:** parar el arnés y Vite. Después, el resumen final al usuario en español y corto: qué anda, qué quedó pendiente, qué le toca hacer a quien usa la app y las decisiones _(decisión)_ para que las revise.
