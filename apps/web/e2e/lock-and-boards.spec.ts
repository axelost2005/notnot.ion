import { expect, test } from '@playwright/test'
import { CODE, deleteE2EBoards, e2eName, unlock } from './helpers'

test.describe('candado', () => {
  test('sin cookie la API devuelve 401 y la web pide el código', async ({ page, request }) => {
    expect((await request.get('/api/health')).status()).toBe(200)
    expect((await request.get('/api/boards')).status()).toBe(401)
    expect((await request.get('/api/session')).status()).toBe(401)

    await page.goto('/')
    await expect(page).toHaveURL(/\/unlock$/)
    await expect(page.getByLabel('Código')).toBeFocused()
  })

  test('con un código incorrecto avisa y no entra', async ({ page }) => {
    // IP propia por corrida: el rate limit (5 fallidos / 15 min) no se acumula entre corridas.
    await page.setExtraHTTPHeaders({ 'X-Forwarded-For': `10.0.${Date.now() % 250}.1` })
    await page.goto('/unlock')
    await page.getByLabel('Código').fill('esto no es el código')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toHaveText('El código no es correcto')
    await expect(page).toHaveURL(/\/unlock$/)
  })

  test('con el código entra al Inicio y "Bloquear" cierra la sesión', async ({ page }) => {
    await page.goto('/unlock')
    await page.getByLabel('Código').fill(CODE)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('list', { name: 'Cuadrados' })).toBeVisible()

    await page.getByRole('button', { name: 'Bloquear' }).click()
    await expect(page).toHaveURL(/\/unlock$/)
    await page.goto('/b/general')
    await expect(page).toHaveURL(/\/unlock$/)
    expect((await page.request.get('/api/boards')).status()).toBe(401)
  })
})

test.describe('tableros', () => {
  test.beforeEach(async ({ page }) => {
    await unlock(page)
  })

  test.afterEach(async ({ page }) => {
    await deleteE2EBoards(page.request)
  })

  test('crear, renombrar, archivar, desarchivar y borrar', async ({ page }) => {
    const name = e2eName('tablero')
    // El cuadrado de un tablero en el Inicio: "<nombre>: N abiertas…".
    const tile = (board: string) => page.getByRole('link', { name: `${board}:` })

    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)

    // Crear: se abre su panel encima del Inicio.
    await page.getByRole('button', { name: 'Nuevo tablero' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nuevo tablero' })
    await dialog.getByLabel('Nombre').fill(name)
    await dialog.getByTitle('Verde').click()
    await expect(dialog.getByRole('radio', { name: 'Verde' })).toBeChecked()
    await dialog.getByRole('button', { name: 'Crear tablero' }).click()
    await expect(page).toHaveURL(new RegExp(`/b/${name}$`))
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    for (const column of ['Por hacer', 'En curso', 'Hecho']) {
      await expect(page.getByRole('heading', { level: 2, name: column })).toBeVisible()
    }

    // Tiene su cuadrado en el Inicio, y desde ahí se vuelve a abrir.
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/$/)
    await tile(name).click()
    await expect(page).toHaveURL(new RegExp(`/b/${name}$`))

    // Renombrar: cambia el slug y la URL
    const renamed = `${name} Ñandú`
    await page.getByRole('button', { name: `Opciones de ${name}` }).click()
    await page.getByRole('menuitem', { name: 'Editar nombre y color' }).click()
    const edit = page.getByRole('dialog', { name: 'Editar tablero' })
    await edit.getByLabel('Nombre').fill(renamed)
    await expect(edit.getByText(`@${name}-nandu`)).toBeVisible()
    await edit.getByRole('button', { name: 'Guardar' }).click()
    await expect(page).toHaveURL(new RegExp(`/b/${name}-nandu$`))
    await expect(page.getByRole('heading', { level: 1, name: renamed })).toBeVisible()

    // Archivar: deja de tener cuadrado y pasa a "Archivados", abajo en el Inicio.
    await page.getByRole('button', { name: `Opciones de ${renamed}` }).click()
    await page.getByRole('menuitem', { name: 'Archivar' }).click()
    await expect(page.getByText('Archivado', { exact: true })).toBeVisible()
    // Con el menú todavía abierto, Esc cierra el menú y no el panel.
    await expect(page.getByRole('menu')).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/$/)
    await expect(tile(renamed)).toHaveCount(0)
    await page.getByRole('button', { name: /Archivados/ }).click()
    await page.getByRole('link', { name: renamed, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/b/${name}-nandu$`))

    // Desarchivar
    await page.getByRole('button', { name: 'Desarchivar' }).click()
    await expect(page.getByText('Archivado', { exact: true })).toBeHidden()

    // Borrar con confirmación: vuelve al Inicio, sin su cuadrado
    await page.getByRole('button', { name: `Opciones de ${renamed}` }).click()
    await page.getByRole('menuitem', { name: 'Borrar…' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText(`¿Borrar «${renamed}»?`)
    await confirm.getByRole('button', { name: 'Borrar tablero' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'General: ' })).toBeVisible()
    await expect(tile(renamed)).toHaveCount(0)
  })

  test('General no se puede renombrar, archivar ni borrar', async ({ page }) => {
    await page.goto('/b/general')
    await page.getByRole('button', { name: 'Opciones de General' }).click()
    await expect(page.getByRole('menuitem', { name: 'Cambiar color' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Archivar' })).toHaveCount(0)
    await expect(page.getByRole('menuitem', { name: /Borrar/ })).toHaveCount(0)
  })

  test('valida el nombre al crear', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Nuevo tablero' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nuevo tablero' })
    await dialog.getByRole('button', { name: 'Crear tablero' }).click()
    await expect(dialog.getByRole('alert')).toHaveText('El nombre no puede quedar vacío')
  })

  test('/ es Tareas: no salta al último tablero y cada tablero tiene su cuadrado', async ({
    page,
  }) => {
    const name = e2eName('ultimo')
    const res = await page.request.post('/api/boards', { data: { name, color: 'teal' } })
    const { slug } = (await res.json()) as { slug: string }

    await page.goto(`/b/${slug}`)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('link', { name: `${name}: al día, 0 abiertas` })).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
