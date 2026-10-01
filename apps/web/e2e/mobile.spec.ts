import { expect, test, type Page } from '@playwright/test'
import { deleteE2EBoards, e2eName, unlock } from './helpers'

test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EBoards(page.request)
})

const column = (page: Page, name: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name, exact: true }) })

async function createBoard(page: Page, label: string) {
  const res = await page.request.post('/api/boards', {
    data: { name: e2eName(label), color: 'violet' },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as { id: string; slug: string; name: string }
}

test('en 375 px captura una nota y mueve la tarjeta con "Mover a…"', async ({ page }) => {
  const board = await createBoard(page, 'mobile')
  await page.goto(`/b/${board.slug}`)

  // Nada se sale de la pantalla.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

  // Notas: arranca con [] y, en touch, Enter hace salto de línea y se envía con el botón.
  await page.getByRole('tab', { name: 'Notas' }).tap()
  const composer = page.getByRole('combobox', { name: `Nueva nota en ${board.name}` })
  await expect(composer).toHaveValue('[] ')
  await composer.tap()
  await composer.pressSequentially('pedir presupuesto')
  await composer.press('Enter')
  await composer.pressSequentially('al proveedor nuevo')
  await expect(composer).toHaveValue('[] pedir presupuesto\nal proveedor nuevo')
  await expect(page.getByText(`1 tarea → ${board.name}`)).toBeVisible()
  await page.getByRole('button', { name: 'Enviar nota' }).tap()
  await expect(page.getByRole('checkbox', { name: 'Tildar pedir presupuesto' })).toBeVisible()
  await expect(composer).toHaveValue('[] ')

  // Tablero: la tarjeta está en "Por hacer"; con "Mover a…" pasa a "En curso".
  await page.getByRole('tab', { name: 'Tablero' }).tap()
  const card = column(page, 'Por hacer').getByRole('button', { name: 'pedir presupuesto' })
  await card.tap()
  const dialog = page.getByRole('dialog', { name: 'Tarjeta' })
  await dialog.getByRole('combobox', { name: 'Columna' }).tap()
  await page.getByRole('option', { name: 'En curso' }).tap()
  const moved = page.waitForResponse((r) => r.url().includes('/move') && r.ok())
  await dialog.getByRole('button', { name: 'Mover', exact: true }).tap()
  await moved
  await expect(dialog).toBeHidden()
  await expect(
    column(page, 'En curso').getByRole('button', { name: 'pedir presupuesto' }),
  ).toBeAttached()
  await expect(
    column(page, 'Por hacer').getByRole('button', { name: 'pedir presupuesto' }),
  ).toHaveCount(0)

  // Y la nota lo sigue mostrando como pendiente.
  await page.getByRole('tab', { name: 'Notas' }).tap()
  await expect(page.getByRole('checkbox', { name: 'Tildar pedir presupuesto' })).not.toBeChecked()
})

test('el título es el selector de tablero', async ({ page }) => {
  const board = await createBoard(page, 'selector')
  await page.goto('/b/general')
  await page.getByRole('button', { name: /cambiar de tablero/ }).tap()
  await page.getByRole('dialog').getByRole('link', { name: board.name }).tap()
  await expect(page).toHaveURL(new RegExp(`/b/${board.slug}$`))
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(board.name) })).toBeVisible()
})
