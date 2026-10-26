import { expect, test, type Page } from '@playwright/test'
import { deleteE2EBoards, deleteE2EGeneralTasks, e2eName, listBoards, unlock } from './helpers'

type Board = { id: string; name: string; slug: string }
type Detail = { columns: { id: string; isDone: boolean; position: string }[] }

const DAY_MS = 24 * 60 * 60 * 1000
const pad = (n: number) => String(n).padStart(2, '0')
const localDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const today = () => localDay(new Date())

async function createBoard(page: Page, label: string): Promise<Board> {
  const res = await page.request.post('/api/boards', {
    data: { name: e2eName(label), color: 'blue' },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as Board
}

/** Una tarea al final de la primera columna del tablero, con día o sin. */
async function createTask(page: Page, boardId: string, title: string, day: string | null) {
  const detail = (await (await page.request.get(`/api/boards/${boardId}`)).json()) as Detail
  const first = detail.columns
    .filter((c) => !c.isDone)
    .sort((a, b) => (a.position < b.position ? -1 : 1))[0]!
  const res = await page.request.post('/api/tasks', { data: { columnId: first.id, title, day } })
  expect(res.status()).toBe(201)
}

const general = async (page: Page) =>
  (await listBoards(page.request)).find((board) => board.slug === 'general')!

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EBoards(page.request)
  await deleteE2EGeneralTasks(page.request)
})

test('anota desde el Inicio, abre el cuadrado encima, tacha y vuelve con Esc', async ({ page }) => {
  const board = await createBoard(page, 'cuadrado')
  const task = e2eName('presupuesto')

  await page.goto('/')
  const capture = page.getByRole('combobox', { name: 'Anotar, para hoy' })
  await capture.fill(`${task} @${board.slug}`)
  await capture.press('Enter')
  await expect(capture).toHaveValue('')
  await expect(page.getByText(`Anotada en ${board.name}, para hoy`)).toBeVisible()

  // El cuadrado del tablero la cuenta: abierta y para hoy.
  const tile = page.getByRole('link', { name: `${board.name}: 1 abierta, 1 para hoy` })
  await expect(tile).toBeVisible()

  // Se abre encima, en la dirección del tablero, con el sol prendido.
  await tile.click()
  await expect(page).toHaveURL(`/b/${board.slug}`)
  const panel = page.getByRole('dialog', { name: board.name })
  await expect(panel.getByRole('button', { name: `Sacar de Hoy: ${task}` })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await panel.getByRole('checkbox', { name: `Tildar ${task}` }).check()
  await expect(panel.getByRole('checkbox', { name: `Destildar ${task}` })).toBeChecked()

  // Esc vuelve al Inicio y el cuadrado suma la tachada.
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const done = page.getByRole('link', { name: `${board.name}: 0 abiertas` })
  await expect(done).toBeVisible()
  await expect(done.getByTitle('Tachadas hoy')).toHaveText('1')
  // "Atrás" no vuelve a abrir el panel: el cierre volvió a la entrada del Inicio.
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Hoy junta lo de los tableros y lo de General; mañana, y lo pendiente de ayer', async ({
  page,
}) => {
  const board = await createBoard(page, 'hoy')
  const fromBoard = e2eName('contrato')
  const fromGeneral = e2eName('dentista')
  const later = e2eName('dominio')
  await createTask(page, board.id, fromBoard, today())
  await createTask(page, (await general(page)).id, fromGeneral, today())
  await createTask(page, board.id, later, today())

  await page.goto('/hoy')
  const panel = page.getByRole('dialog', { name: 'Hoy' })
  const forToday = panel.getByRole('region', { name: /^Para hoy/ })
  // El título abre el detalle (exacto: el sol también lleva el título en su nombre).
  const row = (scope: typeof forToday, name: string) =>
    scope.getByRole('button', { name, exact: true })
  await expect(row(forToday, fromBoard)).toBeVisible()
  await expect(row(forToday, fromGeneral)).toBeVisible()

  // Desde el detalle, una pasa a mañana: queda en "Próximos días".
  await row(forToday, later).click()
  const detail = page.getByRole('dialog', { name: 'Tarjeta' })
  await detail.getByRole('combobox', { name: 'Día' }).click()
  await page.getByRole('option', { name: 'Mañana' }).click()
  await page.keyboard.press('Escape')
  await expect(detail).toBeHidden()
  await expect(panel).toBeVisible()
  const upcoming = panel.getByRole('region', { name: 'Próximos días' })
  // Lejos de su grupo lleva el tablero al lado.
  await expect(row(upcoming, `${later} ${board.name}`)).toBeVisible()
  await expect(row(forToday, later)).toHaveCount(0)

  // Con el reloj en mañana, lo de hoy que no se tachó está en Hoy, "de ayer".
  await page.clock.setFixedTime(new Date(Date.now() + DAY_MS))
  await page.goto('/hoy')
  const nextDay = page
    .getByRole('dialog', { name: 'Hoy' })
    .getByRole('region', { name: /^Para hoy/ })
  await expect(row(nextDay, `${fromBoard} de ayer`)).toBeVisible()
  await expect(row(nextDay, later)).toBeVisible()
})

test('Notas y Finanzas se abren desde su cuadrado; un link directo abre el panel', async ({
  page,
}) => {
  const board = await createBoard(page, 'link')

  await page.goto('/')
  await page.getByRole('link', { name: /^Notas:/ }).click()
  await expect(page).toHaveURL('/p')
  await expect(page.getByRole('dialog', { name: 'Notas' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()
  await expect(page).toHaveURL('/')

  await page.getByRole('link', { name: /^Finanzas:/ }).click()
  await expect(page).toHaveURL(/\/finanzas\/\d{4}-\d{2}$/)
  await expect(page.getByRole('dialog', { name: 'Finanzas' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/')

  await page.goto(`/b/${board.slug}`)
  const panel = page.getByRole('dialog', { name: board.name })
  await expect(panel.getByRole('heading', { level: 1, name: board.name })).toBeVisible()
})

test.describe('en el celu', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })

  test('los cuadrados van de a dos y el panel ocupa la pantalla, sin scroll horizontal', async ({
    page,
  }) => {
    const board = await createBoard(page, 'celu')
    const task = e2eName('fotos')

    await page.goto('/')
    const tiles = page.getByRole('list', { name: 'Cuadrados' }).getByRole('link')
    await expect(tiles.nth(2)).toBeVisible()
    const [first, second, third] = await Promise.all(
      [0, 1, 2].map(async (index) => (await tiles.nth(index).boundingBox())!),
    )
    expect(second!.y).toBe(first!.y)
    expect(second!.x).toBeGreaterThan(first!.x)
    expect(third!.y).toBeGreaterThan(first!.y)

    // La página, el Inicio y lo que scrollea en el panel (los chips de día sí se corren de costado).
    const noOverflow = () =>
      page.evaluate(() =>
        [
          document.documentElement,
          ...document.querySelectorAll('main, [role=dialog] .overflow-y-auto'),
        ].every((el) => el.scrollWidth <= el.clientWidth + 1),
      )
    expect(await noOverflow()).toBe(true)

    await page.getByRole('link', { name: new RegExp(`^${board.name}:`) }).click()
    const panel = page.getByRole('dialog', { name: board.name })
    await expect(panel).toBeVisible()
    // Con el dedo, Enter hace salto de línea: se anota con el botón.
    await panel.getByRole('combobox', { name: `Anotar en ${board.name}, para sin día` }).fill(task)
    await panel.getByRole('button', { name: 'Anotar' }).click()
    await expect(panel.getByRole('region', { name: /Por hacer/ }).getByText(task)).toBeVisible()

    const box = (await page.locator('[role=dialog] [tabindex="-1"]').boundingBox())!
    expect(box.x).toBe(0)
    expect(box.width).toBe(375)
    expect(await noOverflow()).toBe(true)
  })
})
