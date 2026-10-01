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

  test('con el código entra a General y "Bloquear" cierra la sesión', async ({ page }) => {
    await page.goto('/unlock')
    await page.getByLabel('Código').fill(CODE)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/b\/general$/)
    await expect(page.getByRole('heading', { level: 1, name: 'General' })).toBeVisible()

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
    const sidebar = page.getByRole('navigation', { name: 'Tableros' })

    await page.goto('/')
    await expect(page).toHaveURL(/\/b\/general$/)

    // Crear
    await sidebar.getByRole('button', { name: 'Nuevo tablero' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nuevo tablero' })
    await dialog.getByLabel('Nombre').fill(name)
    await dialog.getByTitle('Verde').click()
    await expect(dialog.getByRole('radio', { name: 'Verde' })).toBeChecked()
    await dialog.getByRole('button', { name: 'Crear tablero' }).click()
    await expect(page).toHaveURL(new RegExp(`/b/${name}$`))
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(sidebar.getByRole('link', { name })).toBeVisible()
    for (const column of ['Por hacer', 'En curso', 'Hecho']) {
      await expect(page.getByRole('heading', { level: 2, name: column })).toBeVisible()
    }

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

    // Archivar: pasa a "Archivados"
    await page.getByRole('button', { name: `Opciones de ${renamed}` }).click()
    await page.getByRole('menuitem', { name: 'Archivar' }).click()
    await expect(page.getByText('Archivado', { exact: true })).toBeVisible()
    await sidebar.getByRole('button', { name: /Archivados/ }).click()
    await expect(sidebar.getByRole('link', { name: renamed })).toBeVisible()

    // Desarchivar
    await page.getByRole('button', { name: 'Desarchivar' }).click()
    await expect(page.getByText('Archivado', { exact: true })).toBeHidden()

    // Borrar con confirmación: vuelve a General
    await page.getByRole('button', { name: `Opciones de ${renamed}` }).click()
    await page.getByRole('menuitem', { name: 'Borrar…' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText(`¿Borrar «${renamed}»?`)
    await confirm.getByRole('button', { name: 'Borrar tablero' }).click()
    await expect(page).toHaveURL(/\/b\/general$/)
    await expect(sidebar.getByRole('link', { name: renamed })).toBeHidden()
  })

  test('General no se puede renombrar, archivar ni borrar', async ({ page }) => {
    await page.goto('/b/general')
    await page.getByRole('button', { name: 'Opciones de General' }).click()
    await expect(page.getByRole('menuitem', { name: 'Cambiar color' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Archivar' })).toHaveCount(0)
    await expect(page.getByRole('menuitem', { name: /Borrar/ })).toHaveCount(0)
  })

  test('valida el nombre al crear', async ({ page }) => {
    await page.goto('/b/general')
    await page.getByRole('button', { name: 'Nuevo tablero' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nuevo tablero' })
    await dialog.getByRole('button', { name: 'Crear tablero' }).click()
    await expect(dialog.getByRole('alert')).toHaveText('El nombre no puede quedar vacío')
  })

  test('/ abre el último tablero usado', async ({ page }) => {
    const name = e2eName('ultimo')
    const res = await page.request.post('/api/boards', { data: { name, color: 'teal' } })
    const { slug } = (await res.json()) as { slug: string }

    await page.goto(`/b/${slug}`)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await page.goto('/')
    await expect(page).toHaveURL(new RegExp(`/b/${slug}$`))
  })
})
