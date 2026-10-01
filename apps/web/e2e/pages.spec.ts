import { expect, test, type Page } from '@playwright/test'
import { deleteE2EPages, e2eName, unlock } from './helpers'

const notes = (page: Page) => page.getByRole('navigation', { name: 'Notas' })

/** Abre el menú "…" de una fila del árbol y elige una opción. */
async function rowAction(page: Page, rowLabel: string, action: string) {
  await notes(page).getByRole('button', { name: rowLabel }).click()
  await page.getByRole('menuitem', { name: action }).click()
}

/** Escribe el nombre de una carpeta recién creada (queda lista para renombrar). */
async function nameFolder(page: Page, name: string) {
  const input = notes(page).getByRole('textbox', { name: 'Nombre de la carpeta' })
  await expect(input).toBeFocused()
  await input.fill(name)
  await input.press('Enter')
  await expect(notes(page).getByRole('button', { name, exact: true })).toBeVisible()
}

/** Crea una nota adentro de `folder` (o suelta) y le escribe título y texto. */
async function writePage(page: Page, folder: string | null, title: string, text: string) {
  if (folder) await rowAction(page, `Opciones de la carpeta ${folder}`, 'Nueva nota adentro')
  else {
    await notes(page).getByRole('button', { name: 'Nueva nota o carpeta' }).click()
    await page.getByRole('menuitem', { name: 'Nueva nota' }).click()
  }
  const titleInput = page.getByRole('textbox', { name: 'Título' })
  await expect(titleInput).toBeFocused()
  await titleInput.fill(title)
  await titleInput.press('Enter')
  await expect(page.getByRole('textbox', { name: 'Texto' })).toBeFocused()
  await page.keyboard.type(text)
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible()
  await expect(notes(page).getByRole('link', { name: title })).toBeVisible()
  return page.url().split('/p/')[1]!
}

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EPages(page.request)
})

test('carpetas con carpetas adentro y notas que se guardan solas, se mueven, renombran y borran', async ({
  page,
}) => {
  const clients = e2eName('clientes')
  const renamed = e2eName('clientes viejos')
  const access = e2eName('accesos')
  const invoices = e2eName('facturas')
  const loose = e2eName('ideas')
  await page.goto('/b/general')

  // Carpeta en la raíz y otra adentro.
  await notes(page).getByRole('button', { name: 'Nueva nota o carpeta' }).click()
  await page.getByRole('menuitem', { name: 'Nueva carpeta' }).click()
  await nameFolder(page, clients)
  await rowAction(page, `Opciones de la carpeta ${clients}`, 'Nueva carpeta adentro')
  await nameFolder(page, 'Pepito')

  // Dos notas adentro de la subcarpeta y una suelta. Se guardan solas.
  const accessId = await writePage(page, 'Pepito', access, 'usuario: pepito\nclave en el gestor')
  const invoicesId = await writePage(page, 'Pepito', invoices, 'septiembre pagada')
  await writePage(page, null, loose, 'una idea')
  await expect(page).toHaveTitle(new RegExp(loose))

  // Recargar la primera: el texto sigue ahí.
  await page.goto(`/p/${accessId}`)
  await expect(page.getByRole('textbox', { name: 'Título' })).toHaveValue(access)
  await expect(page.getByRole('textbox', { name: 'Texto' })).toHaveValue(
    'usuario: pepito\nclave en el gestor',
  )
  await expect(page.getByRole('navigation', { name: 'Ubicación' })).toContainText('Pepito')

  // "Mover a…" la deja suelta, en la raíz.
  await page.getByRole('button', { name: 'Opciones de esta nota' }).click()
  await page.getByRole('menuitem', { name: 'Mover a…' }).click()
  const move = page.getByRole('dialog', { name: 'Mover la nota' })
  await move.getByRole('combobox', { name: 'Mover a' }).click()
  await page.getByRole('option', { name: 'Notas (sin carpeta)' }).click()
  await move.getByRole('button', { name: 'Mover', exact: true }).click()
  await expect(move).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Ubicación' })).not.toContainText('Pepito')
  const moved = (await (await page.request.get(`/api/pages/${accessId}`)).json()) as {
    folderId: string | null
  }
  expect(moved.folderId).toBeNull()

  // Renombrar la carpeta en el árbol.
  await rowAction(page, `Opciones de la carpeta ${clients}`, 'Renombrar')
  await nameFolder(page, renamed)

  // Borrarla pide confirmación y se lleva lo de adentro.
  await rowAction(page, `Opciones de la carpeta ${renamed}`, 'Borrar')
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('1 carpeta y 1 nota')
  await confirm.getByRole('button', { name: 'Borrar la carpeta' }).click()
  await expect(notes(page).getByRole('button', { name: renamed, exact: true })).toHaveCount(0)
  await expect(notes(page).getByRole('link', { name: invoices })).toHaveCount(0)
  expect((await page.request.get(`/api/pages/${invoicesId}`)).status()).toBe(404)
  // Lo que estaba afuera sigue.
  await expect(notes(page).getByRole('link', { name: access })).toBeVisible()
  await expect(notes(page).getByRole('link', { name: loose })).toBeVisible()
})

test.describe('celu', () => {
  test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })

  test('en 375 px se llega a una nota desde el panel lateral', async ({ page }) => {
    const title = e2eName('nota del celu')
    const res = await page.request.post('/api/pages', { data: { title } })
    const created = (await res.json()) as { id: string }
    await page.request.patch(`/api/pages/${created.id}`, { data: { content: 'desde el celu' } })

    await page.goto('/b/general')
    await page.getByRole('button', { name: /cambiar de tablero/ }).tap()
    const menu = page.getByRole('dialog', { name: 'Menú' })
    await menu.getByRole('link', { name: title }).tap()
    await expect(page).toHaveURL(new RegExp(`/p/${created.id}$`))
    await expect(menu).toBeHidden()
    await expect(page.getByRole('textbox', { name: 'Texto' })).toHaveValue('desde el celu')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

    // Desde la nota, el título del header vuelve a abrir el menú.
    await page.getByRole('button', { name: /abrir el menú/ }).tap()
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible()
  })
})
