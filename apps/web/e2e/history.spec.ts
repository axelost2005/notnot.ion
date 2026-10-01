import { expect, test, type Page } from '@playwright/test'
import { deleteE2EBoards, e2eName, unlock } from './helpers'

const column = (page: Page, name: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name, exact: true }) })

const titlesIn = (page: Page, name: string) => column(page, name).locator('ol > li').allInnerTexts()

const notesPanel = (page: Page) => page.getByRole('complementary', { name: 'Notas' })

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EBoards(page.request)
})

test('al otro día, lo terminado pasa de "Hecho" al Historial', async ({ page }) => {
  const res = await page.request.post('/api/boards', {
    data: { name: e2eName('historial'), color: 'amber' },
  })
  const board = (await res.json()) as { id: string; slug: string }

  // Dos tareas desde una nota: una se termina hoy y la otra queda pendiente.
  const created = await page.request.post('/api/notes', {
    data: { boardId: board.id, content: '[] mandar la factura\n[] llamar a Juan' },
  })
  const note = (await created.json()) as { tasks: { id: string; title: string }[] }
  const invoice = note.tasks.find((t) => t.title === 'mandar la factura')!
  await page.request.post(`/api/tasks/${invoice.id}/toggle-done`)

  await page.goto(`/b/${board.slug}`)
  await expect.poll(() => titlesIn(page, 'Hecho')).toEqual(['mandar la factura'])

  // Mañana, según el reloj del navegador: "Hecho" arranca vacío y lo pendiente sigue.
  await page.clock.setFixedTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
  await page.reload()
  await expect.poll(() => titlesIn(page, 'Por hacer')).toEqual(['llamar a Juan'])
  await expect.poll(() => titlesIn(page, 'Hecho')).toEqual([])

  // Está en el Historial, en "Ayer".
  await page.getByRole('button', { name: 'Historial', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Historial' })
  await expect(sheet.getByRole('heading', { name: 'Ayer' })).toBeVisible()
  await expect(sheet.getByText('mandar la factura')).toBeVisible()
  await page.keyboard.press('Escape')

  // En la nota sigue tildada pero ya no abre la tarjeta. Destildarla la vuelve al tablero.
  const panel = notesPanel(page)
  await expect(panel.getByRole('button', { name: 'mandar la factura' })).toHaveCount(0)
  const toggled = page.waitForResponse((r) => r.url().includes('/toggle-done') && r.ok())
  await panel.getByRole('checkbox', { name: 'Destildar mandar la factura' }).uncheck()
  await toggled
  await expect
    .poll(() => titlesIn(page, 'Por hacer'))
    .toEqual(['mandar la factura', 'llamar a Juan'])
})
