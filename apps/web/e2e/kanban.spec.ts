import { expect, test, type Locator, type Page } from '@playwright/test'
import { deleteE2EBoards, e2eName, unlock } from './helpers'

const column = (page: Page, name: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name, exact: true }) })

const card = (scope: Page | Locator, title: string) =>
  scope.getByRole('button', { name: title, exact: true })

async function titlesIn(page: Page, name: string) {
  return column(page, name).locator('ol > li').allInnerTexts()
}

/** Arrastre con mouse real: dnd-kit necesita movimientos intermedios. */
async function dragWithMouse(page: Page, source: Locator, target: Locator, edge: 'top' | 'center') {
  // Con el panel de notas abierto, la columna puede quedar fuera de vista.
  await source.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('No se pudo medir la tarjeta o el destino')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 12, { steps: 4 })
  const y = edge === 'top' ? to.y + 4 : to.y + to.height / 2
  await page.mouse.move(to.x + to.width / 2, y, { steps: 20 })
  await page.mouse.up()
}

const moveResponse = (page: Page) =>
  page.waitForResponse((res) => res.url().includes('/move') && res.request().method() === 'POST')

async function createBoard(page: Page, label: string) {
  const res = await page.request.post('/api/boards', {
    data: { name: e2eName(label), color: 'blue' },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as { id: string; slug: string; name: string }
}

async function addCards(page: Page, columnName: string, titles: string[]) {
  const lane = column(page, columnName)
  await lane.getByRole('button', { name: 'Agregar tarjeta' }).click()
  const composer = lane.getByRole('textbox', { name: `Nueva tarjeta en ${columnName}` })
  for (const title of titles) {
    await composer.fill(title)
    await composer.press('Enter')
    await expect(card(lane, title)).toBeVisible()
  }
  await composer.press('Escape')
}

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EBoards(page.request)
})

test('crea tarjetas, las mueve dentro y entre columnas y el orden sobrevive a recargar', async ({
  page,
}) => {
  const board = await createBoard(page, 'kanban')
  await page.goto(`/b/${board.slug}`)

  await addCards(page, 'Por hacer', ['uno', 'dos', 'tres'])
  expect(await titlesIn(page, 'Por hacer')).toEqual(['uno', 'dos', 'tres'])

  // Dentro de la columna: "tres" arriba de todo.
  let moved = moveResponse(page)
  await dragWithMouse(page, card(page, 'tres'), card(page, 'uno'), 'top')
  expect((await moved).ok()).toBe(true)
  await expect.poll(() => titlesIn(page, 'Por hacer')).toEqual(['tres', 'uno', 'dos'])

  // A otra columna: "dos" a "En curso".
  moved = moveResponse(page)
  await dragWithMouse(page, card(page, 'dos'), column(page, 'En curso'), 'center')
  expect((await moved).ok()).toBe(true)
  await expect.poll(() => titlesIn(page, 'En curso')).toEqual(['dos'])
  expect(await titlesIn(page, 'Por hacer')).toEqual(['tres', 'uno'])

  await page.reload()
  await expect(card(page, 'tres')).toBeVisible()
  expect(await titlesIn(page, 'Por hacer')).toEqual(['tres', 'uno'])
  expect(await titlesIn(page, 'En curso')).toEqual(['dos'])
})

test('mueve una tarjeta con el teclado', async ({ page }) => {
  const board = await createBoard(page, 'teclado')
  await page.goto(`/b/${board.slug}`)
  await addCards(page, 'Por hacer', ['primera', 'segunda'])

  // Los anuncios para lectores de pantalla marcan cada paso (y de paso se prueban).
  const announcer = page.locator('[aria-live="assertive"]')
  await card(page, 'primera').focus()
  const moved = moveResponse(page)
  await page.keyboard.press('Space')
  await expect(announcer).toContainText('primera está en Por hacer, posición 1 de 2')
  await page.keyboard.press('ArrowDown')
  await expect(announcer).toContainText('posición 2 de 2')
  await page.keyboard.press('Space')
  await expect(announcer).toContainText('Soltaste primera')
  expect((await moved).ok()).toBe(true)
  await expect.poll(() => titlesIn(page, 'Por hacer')).toEqual(['segunda', 'primera'])

  await page.reload()
  await expect(card(page, 'segunda')).toBeVisible()
  expect(await titlesIn(page, 'Por hacer')).toEqual(['segunda', 'primera'])
})

test('detalle: editar, mover a otra columna y borrar', async ({ page }) => {
  const board = await createBoard(page, 'detalle')
  await page.goto(`/b/${board.slug}`)
  await addCards(page, 'Por hacer', ['Llamar al cliente'])

  await card(page, 'Llamar al cliente').click()
  const dialog = page.getByRole('dialog', { name: 'Tarjeta' })
  await dialog.getByLabel('Título').fill('Llamar al cliente por la factura')
  await dialog.getByLabel('Descripción').fill('Pedir el CUIT nuevo.')
  await dialog.getByLabel('Columna').selectOption({ label: 'Hecho' })
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).toBeHidden()

  const done = column(page, 'Hecho')
  await expect(card(done, 'Llamar al cliente por la factura')).toBeVisible()
  await expect(
    card(done, 'Llamar al cliente por la factura').getByRole('img', { name: 'Tiene descripción' }),
  ).toBeVisible()

  await card(done, 'Llamar al cliente por la factura').click()
  await expect(dialog.getByLabel('Descripción')).toHaveValue('Pedir el CUIT nuevo.')
  await expect(dialog).toContainText('terminada el')
  await dialog.getByRole('button', { name: 'Borrar tarjeta' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar tarjeta' }).click()
  await expect(dialog).toBeHidden()
  await expect(card(page, 'Llamar al cliente por la factura')).toHaveCount(0)
})

test('columnas: agregar, renombrar, elegir la de terminadas y borrar', async ({ page }) => {
  const board = await createBoard(page, 'columnas')
  await page.goto(`/b/${board.slug}`)

  await page.getByRole('button', { name: 'Agregar columna' }).click()
  await page.getByLabel('Nombre de la nueva columna').fill('Revisión')
  await page.getByRole('button', { name: 'Agregar columna' }).click()
  // Va antes de "Hecho".
  await expect(page.locator('section h2')).toHaveText([
    'Por hacer',
    'En curso',
    'Revisión',
    'Hecho',
  ])

  await page.getByRole('button', { name: 'Opciones de la columna Revisión' }).click()
  await page.getByRole('menuitem', { name: 'Renombrar' }).click()
  const input = page.getByLabel('Nombre de la columna')
  await input.fill('QA')
  await input.press('Enter')
  await expect(page.getByRole('heading', { level: 2, name: 'QA' })).toBeVisible()

  // "Hecho" no se puede borrar: es la de terminadas.
  await page.getByRole('button', { name: 'Opciones de la columna Hecho' }).click()
  await expect(page.getByRole('menuitem', { name: /Borrar columna/ })).toBeDisabled()
  await page.keyboard.press('Escape')

  // QA pasa a ser la de terminadas y Hecho queda como una más.
  await page.getByRole('button', { name: 'Opciones de la columna QA' }).click()
  await page.getByRole('menuitem', { name: 'Usar para terminadas' }).click()
  await expect(column(page, 'QA').getByRole('img', { name: 'Columna de terminadas' })).toBeVisible()
  await expect(
    column(page, 'Hecho').getByRole('img', { name: 'Columna de terminadas' }),
  ).toHaveCount(0)

  // Ahora "Hecho" está vacía y no es la de terminadas: se puede borrar.
  await page.getByRole('button', { name: 'Opciones de la columna Hecho' }).click()
  await page.getByRole('menuitem', { name: /Borrar columna/ }).click()
  await expect(page.locator('section h2')).toHaveText(['Por hacer', 'En curso', 'QA'])
})
