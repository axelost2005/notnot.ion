import { expect, test, type Locator, type Page } from '@playwright/test'
import { deleteE2EBoards, deleteE2EGeneralTasks, e2eName, unlock } from './helpers'

const lane = (page: Page, name: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name, exact: true }) })

const titlesIn = (page: Page, name: string) => lane(page, name).locator('ol > li').allInnerTexts()

/** Un tablero con una tarjeta en "Por hacer". */
async function createBoardWithTask(page: Page, label: string, title: string) {
  const res = await page.request.post('/api/boards', {
    data: { name: e2eName(label), color: 'blue' },
  })
  const board = (await res.json()) as { id: string; slug: string; name: string }
  const detail = (await (await page.request.get(`/api/boards/${board.id}`)).json()) as {
    columns: { id: string; name: string }[]
  }
  const todo = detail.columns.find((c) => c.name === 'Por hacer')!
  await page.request.post('/api/tasks', { data: { columnId: todo.id, title } })
  return board
}

async function dragTo(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('No se pudo medir el arrastre')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 12, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EGeneralTasks(page.request)
  await deleteE2EBoards(page.request)
})

test('General junta las tarjetas de todos los tableros y arrastrarlas les cambia el estado', async ({
  page,
}) => {
  const ana = await createBoardWithTask(page, 'general-a', 'llamar a Ana')
  await createBoardWithTask(page, 'general-b', 'mandar el presupuesto a Beto')

  await page.goto('/b/general')
  const card = lane(page, 'Por hacer').getByRole('button', { name: 'llamar a Ana', exact: true })
  await expect(card).toBeVisible()
  // Cada tarjeta dice de qué tablero es.
  await expect(card.getByText(ana.name)).toBeVisible()
  await expect(
    lane(page, 'Por hacer').getByRole('button', { name: 'mandar el presupuesto a Beto' }),
  ).toBeVisible()

  // Arrastrarla a "En curso" la mueve en su propio tablero.
  const moved = page.waitForResponse((r) => r.url().includes('/move') && r.ok())
  await dragTo(page, card, lane(page, 'En curso'))
  await moved
  await expect(
    lane(page, 'En curso').getByRole('button', { name: 'llamar a Ana', exact: true }),
  ).toBeVisible()
  await page.goto(`/b/${ana.slug}`)
  await expect.poll(() => titlesIn(page, 'En curso')).toEqual(['llamar a Ana'])

  // Lo que se agrega desde General es de General: va sin chip.
  await page.goto('/b/general')
  const title = e2eName('tarea general')
  await lane(page, 'Por hacer').getByRole('button', { name: 'Agregar tarjeta' }).click()
  const composer = lane(page, 'Por hacer').getByRole('textbox', {
    name: 'Nueva tarjeta en Por hacer',
  })
  await composer.fill(title)
  await composer.press('Enter')
  await expect(lane(page, 'Por hacer').locator('li', { hasText: title })).toHaveText(title)
})
