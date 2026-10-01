import { expect, test, type Page } from '@playwright/test'
import { deleteE2EBoards, e2eName, unlock } from './helpers'

const column = (page: Page, name: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name, exact: true }) })

async function createBoard(page: Page, label: string) {
  const res = await page.request.post('/api/boards', {
    data: { name: e2eName(label), color: 'teal' },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as { id: string; slug: string; name: string }
}

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EBoards(page.request)
})

test('las notas se abren en otra ventana y ahí se cambia de tablero', async ({ page }) => {
  const first = await createBoard(page, 'ventana-1')
  const second = await createBoard(page, 'ventana-2')
  await page.goto(`/b/${first.slug}`)

  const opened = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Abrir las notas en otra ventana' }).click()
  const notes = await opened
  await expect(notes).toHaveURL(new RegExp(`/notas/${first.slug}$`))
  // Solo las notas: sin la lista de tableros.
  await expect(notes.getByRole('navigation', { name: 'Tableros' })).toHaveCount(0)
  await expect(notes.getByRole('combobox', { name: `Nueva nota en ${first.name}` })).toBeFocused()

  // Mientras tanto, la ventana principal muestra el segundo tablero.
  await page.goto(`/b/${second.slug}`)

  // Cambiar de tablero en la ventana de notas con el teclado y seguir escribiendo.
  const selector = notes.getByRole('combobox', { name: 'Tablero', exact: true })
  await expect(selector).toHaveText(first.name)
  await selector.focus()
  await notes.keyboard.press('Enter')
  await expect(notes.getByRole('option', { name: first.name })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await notes.keyboard.type(second.name)
  await expect(notes.getByRole('option', { name: second.name })).toBeFocused()
  await notes.keyboard.press('Enter')
  await expect(notes).toHaveURL(new RegExp(`/notas/${second.slug}$`))
  const composer = notes.getByRole('combobox', { name: `Nueva nota en ${second.name}` })
  await expect(composer).toBeFocused()
  await composer.pressSequentially('revisar la propuesta')
  const created = notes.waitForResponse((r) => r.url().endsWith('/api/notes') && r.status() === 201)
  await composer.press('Enter')
  await created

  // En la ventana la tarea se tilda, pero el título no lleva a la tarjeta.
  await expect(notes.getByRole('checkbox', { name: 'Tildar revisar la propuesta' })).toBeVisible()
  await expect(notes.getByRole('button', { name: 'revisar la propuesta' })).toHaveCount(0)

  // La ventana principal la muestra sin recargar.
  await expect(
    column(page, 'Por hacer').getByRole('button', { name: 'revisar la propuesta' }),
  ).toBeVisible()
})
