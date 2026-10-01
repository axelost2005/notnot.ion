import { expect, test, type Locator, type Page } from '@playwright/test'
import { deleteE2EBoards, deleteE2EGeneralTasks, e2eName, listBoards, unlock } from './helpers'

const column = (page: Page, name: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name, exact: true }) })

const card = (scope: Locator, title: string) =>
  scope.getByRole('button', { name: title, exact: true })

type Board = { id: string; slug: string; name: string }
type Detail = { columns: { id: string; name: string; isDone: boolean }[] }

async function createBoard(page: Page, label: string): Promise<Board> {
  const res = await page.request.post('/api/boards', {
    data: { name: e2eName(label), color: 'green' },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as Board
}

async function addTask(page: Page, board: Board, title: string, description?: string) {
  const detail = (await (await page.request.get(`/api/boards/${board.id}`)).json()) as Detail
  const todo = detail.columns.find((c) => c.name === 'Por hacer')!
  const res = await page.request.post('/api/tasks', {
    data: { columnId: todo.id, title, description },
  })
  expect(res.status()).toBe(201)
}

const toggled = (page: Page) =>
  page.waitForResponse((r) => r.url().includes('/toggle-done') && r.request().method() === 'POST')

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EGeneralTasks(page.request)
  await deleteE2EBoards(page.request)
})

test('la tarjeta: checkbox, título y una línea de la descripción; tildarla no la abre', async ({
  page,
}) => {
  const board = await createBoard(page, 'tarjeta')
  await addTask(page, board, 'mandar el contrato', 'Revisar la cláusula 3\ny mandarlo firmado')
  await page.goto(`/b/${board.slug}`)

  const todo = column(page, 'Por hacer')
  const done = column(page, 'Hecho')
  // La descripción va en una línea (los saltos pasan a espacios) y se corta con "…".
  const preview = todo.getByText('Revisar la cláusula 3 y mandarlo firmado', { exact: true })
  await expect(preview).toBeVisible()
  await expect(preview).toHaveCSS('text-overflow', 'ellipsis')
  await expect(preview).toHaveCSS('white-space', 'nowrap')

  // Tildar la manda a "Hecho" y no abre el detalle.
  let response = toggled(page)
  await todo.getByRole('checkbox', { name: 'Tildar mandar el contrato' }).click()
  expect((await response).ok()).toBe(true)
  await expect(card(done, 'mandar el contrato')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(done.getByRole('checkbox', { name: 'Destildar mandar el contrato' })).toBeChecked()

  // Con el teclado: espacio destilda y vuelve a "Por hacer".
  response = toggled(page)
  await done.getByRole('checkbox', { name: 'Destildar mandar el contrato' }).focus()
  await page.keyboard.press('Space')
  expect((await response).ok()).toBe(true)
  await expect(card(todo, 'mandar el contrato')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.reload()
  await expect(todo.getByRole('checkbox', { name: 'Tildar mandar el contrato' })).not.toBeChecked()
})

test('en General: el checkbox tilda tarjetas de otro tablero y se agrega en "En curso" y "Hecho"', async ({
  page,
}) => {
  const board = await createBoard(page, 'general-tarjeta')
  await addTask(page, board, 'cobrar la factura')
  await page.goto('/b/general')

  const todo = column(page, 'Por hacer')
  const doing = column(page, 'En curso')
  const done = column(page, 'Hecho')
  await expect(card(todo, 'cobrar la factura')).toContainText(board.name)

  const response = toggled(page)
  await todo.getByRole('checkbox', { name: 'Tildar cobrar la factura' }).click()
  expect((await response).ok()).toBe(true)
  await expect(card(done, 'cobrar la factura')).toContainText(board.name)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // "Agregar tarjeta" en las tres columnas: crea tareas de General en la que corresponde.
  for (const [lane, title] of [
    [doing, e2eName('en curso')],
    [done, e2eName('hecha')],
  ] as const) {
    await lane.getByRole('button', { name: 'Agregar tarjeta' }).click()
    const composer = lane.getByRole('textbox', { name: /^Nueva tarjeta en/ })
    await composer.fill(title)
    await composer.press('Enter')
    await expect(card(lane, title)).toBeVisible()
    await composer.press('Escape')
  }

  const general = (await listBoards(page.request)).find((b) => b.slug === 'general')!
  const detail = (await (await page.request.get(`/api/boards/${general.id}`)).json()) as Detail & {
    tasks: { title: string; columnId: string }[]
  }
  const columnOf = (prefix: string) =>
    detail.columns.find(
      (c) => c.id === detail.tasks.find((t) => t.title.startsWith(prefix))?.columnId,
    )
  expect(columnOf('e2e-en curso')?.name).toBe('En curso')
  expect(columnOf('e2e-hecha')?.isDone).toBe(true)
})

test('el título de cada columna lleva el color de su rol, en claro y en oscuro', async ({
  page,
}) => {
  const board = await createBoard(page, 'colores')
  const colorOf = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).color)
  const token = (name: string) =>
    page.evaluate((variable) => {
      const probe = document.createElement('span')
      probe.style.color = `var(${variable})`
      document.body.append(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    }, name)
  const heading = (name: string) => column(page, name).getByRole('heading', { level: 2 })

  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    for (const path of [`/b/${board.slug}`, '/b/general']) {
      await page.goto(path)
      await expect(heading('Por hacer')).toBeVisible()
      expect(await colorOf(heading('Por hacer'))).toBe(await token('--status-todo'))
      expect(await colorOf(heading('En curso'))).toBe(await token('--status-doing'))
      expect(await colorOf(heading('Hecho'))).toBe(await token('--status-done'))
    }
  }
  expect(new Set([await token('--status-todo'), await token('--status-doing')]).size).toBe(2)
})
