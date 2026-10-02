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

/** La barra de abajo: Tablero, Notas, Finanzas y Menú. */
const nav = (page: Page) => page.getByRole('navigation', { name: 'Secciones' })

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
  await nav(page).getByRole('link', { name: 'Notas' }).tap()
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
  await nav(page).getByRole('link', { name: 'Tablero' }).tap()
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
  await nav(page).getByRole('link', { name: 'Notas' }).tap()
  await expect(page.getByRole('checkbox', { name: 'Tildar pedir presupuesto' })).not.toBeChecked()
})

test('el tablero es una lista: las columnas van una abajo de la otra', async ({ page }) => {
  const board = await createBoard(page, 'lista')
  await page.goto(`/b/${board.slug}`)
  const lanes = [column(page, 'Por hacer'), column(page, 'En curso'), column(page, 'Hecho')]
  await expect(lanes[2]!).toBeVisible()

  const boxes = await Promise.all(lanes.map((lane) => lane.boundingBox()))
  for (const box of boxes) expect(box!.width).toBeGreaterThan(330)
  expect(boxes[1]!.y).toBeGreaterThanOrEqual(boxes[0]!.y + boxes[0]!.height)
  expect(boxes[2]!.y).toBeGreaterThanOrEqual(boxes[1]!.y + boxes[1]!.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})

test('la barra de abajo lleva a Finanzas, al menú y de vuelta al tablero', async ({ page }) => {
  const board = await createBoard(page, 'barra')
  await page.goto(`/b/${board.slug}`)
  await expect(nav(page).getByRole('link', { name: 'Tablero' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  const finance = nav(page).getByRole('link', { name: /^Finanzas/ })
  await finance.tap()
  await expect(page).toHaveURL(/\/finanzas\/\d{4}-\d{2}$/)
  await expect(finance).toHaveAttribute('aria-current', 'page')

  // "Tablero" vuelve al último que se abrió.
  await nav(page).getByRole('link', { name: 'Tablero' }).tap()
  await expect(page).toHaveURL(new RegExp(`/b/${board.slug}$`))

  // "Menú" abre la lista de tableros (y la sección Notas).
  await nav(page).getByRole('button', { name: 'Menú' }).tap()
  const menu = page.getByRole('dialog', { name: 'Menú' })
  await menu.getByRole('link', { name: /^General/ }).tap()
  await expect(page).toHaveURL(/\/b\/general$/)
  await expect(menu).toBeHidden()
})

test('el título es el selector de tablero', async ({ page }) => {
  const board = await createBoard(page, 'selector')
  await page.goto('/b/general')
  await page.getByRole('button', { name: /cambiar de tablero/ }).tap()
  await page.getByRole('dialog').getByRole('link', { name: board.name }).tap()
  await expect(page).toHaveURL(new RegExp(`/b/${board.slug}$`))
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(board.name) })).toBeVisible()
})
