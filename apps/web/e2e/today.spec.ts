import { expect, test, type Locator, type Page } from '@playwright/test'
import { deleteE2EDayItems, e2eName, unlock } from './helpers'

type Item = { text: string; day: string; doneAt: string | null }

const DAY_MS = 24 * 60 * 60 * 1000

/** Lo que tiene guardado la API (los optimistas ya se ven antes de que llegue). */
async function saved(page: Page) {
  const res = await page.request.get('/api/day-items')
  const items = (await res.json()) as Item[]
  return items.filter((item) => item.text.includes('e2e-'))
}

const region = (page: Page, name: string | RegExp) => page.getByRole('region', { name })
/** Las filas de este test (en la base de dev puede haber otras). */
const mine = (scope: Locator) => scope.getByRole('listitem').filter({ hasText: 'e2e-' })
const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Cuántas quedan para hoy sin contar las de los tests (el número de la sidebar). */
async function othersLeftToday(page: Page) {
  const res = await page.request.get('/api/day-items')
  const items = (await res.json()) as Item[]
  const today = localDay(new Date())
  return items.filter((i) => !i.text.includes('e2e-') && i.doneAt === null && i.day <= today).length
}
const row = (page: Page, text: string) => page.getByRole('listitem').filter({ hasText: text })

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EDayItems(page.request)
})

test('anota, tacha, edita y mueve; al otro día lo pendiente pasa a Hoy', async ({ page }) => {
  const perra = e2eName('veterinario')
  const pepito = e2eName('pepito')
  const luz = e2eName('luz')
  const dentista = e2eName('dentista')

  const others = await othersLeftToday(page)
  await page.goto('/hoy')
  const today = region(page, 'Hoy')

  // Una con Enter y dos pegando dos líneas (con viñetas): quedan 3 para hoy.
  const composer = page.getByRole('textbox', { name: 'Anotar para hoy' })
  await expect(composer).toBeFocused()
  await composer.fill(perra)
  await composer.press('Enter')
  await expect(composer).toHaveValue('')
  await composer.fill(`- ${pepito}\n- ${luz}`)
  await expect(page.getByText('2 cosas para hoy')).toBeVisible()
  await composer.press('Enter')
  await expect(mine(today)).toHaveCount(3)
  await expect(today.getByRole('button', { name: `Editar ${pepito}` })).toBeVisible()

  // Con el chip "Mañana", otra para mañana.
  await page.getByRole('radio', { name: 'Mañana' }).check()
  const tomorrowComposer = page.getByRole('textbox', { name: 'Anotar para mañana' })
  await tomorrowComposer.fill(dentista)
  await tomorrowComposer.press('Enter')
  const tomorrow = region(page, /^Mañana · /)
  await expect(mine(tomorrow)).toHaveCount(1)

  // La sidebar dice cuántas quedan para hoy; tachar una la baja.
  const sidebar = page.getByRole('navigation', { name: 'Hoy' })
  await expect(sidebar.getByLabel(`${others + 3} para hoy`)).toBeVisible()
  await today.getByRole('checkbox', { name: `Tildar ${perra}` }).check()
  await expect(today.getByRole('checkbox', { name: `Destildar ${perra}` })).toBeChecked()
  await expect(sidebar.getByLabel(`${others + 2} para hoy`)).toBeVisible()

  // Editar una tocando su texto.
  await today.getByRole('button', { name: `Editar ${pepito}` }).click()
  const input = today.getByRole('textbox', { name: 'Texto' })
  await expect(input).toBeFocused()
  await input.fill(`${pepito}-mail`)
  await input.press('Enter')
  await expect(today.getByRole('button', { name: `Editar ${pepito}-mail` })).toBeVisible()

  // Pasar otra a mañana desde su "…".
  await row(page, luz)
    .getByRole('button', { name: `Opciones de ${luz}` })
    .click()
  await page.getByRole('menuitemradio', { name: 'Mañana' }).click()
  await expect(mine(tomorrow)).toHaveCount(2)
  await expect(mine(today)).toHaveCount(2)

  await expect
    .poll(async () => (await saved(page)).map((item) => item.text).sort())
    .toEqual([perra, `${pepito}-mail`, luz, dentista].sort())
  await expect
    .poll(async () => (await saved(page)).filter((item) => item.doneAt !== null).length)
    .toBe(1)
  await expect.poll(async () => new Set((await saved(page)).map((item) => item.day)).size).toBe(2)

  // Mañana, según el reloj del navegador: la tachada ya no está, lo pendiente de ayer sigue en
  // Hoy (marcado) y lo que era para mañana también.
  await page.clock.setFixedTime(new Date(Date.now() + DAY_MS))
  await page.reload()
  await expect(mine(today)).toHaveCount(3)
  await expect(page.getByText(perra)).toHaveCount(0)
  await expect(row(page, `${pepito}-mail`)).toContainText('de ayer')
  await expect(row(page, luz)).not.toContainText('de ayer')
  await expect(row(page, dentista)).toBeVisible()
  await expect(mine(region(page, /^Mañana · /))).toHaveCount(0)

  // Borrar una.
  await row(page, dentista)
    .getByRole('button', { name: `Opciones de ${dentista}` })
    .click()
  await page.getByRole('menuitem', { name: 'Borrar' }).click()
  await expect(mine(today)).toHaveCount(2)
  await expect
    .poll(async () => (await saved(page)).some((item) => item.text === dentista))
    .toBe(false)
})

test.describe('en el celu', () => {
  test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })

  test('llega desde la barra de abajo y anota sin scroll horizontal', async ({ page }) => {
    const text = e2eName('alimento')
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Secciones' })
    await nav.getByRole('link', { name: /^Hoy/ }).tap()
    await expect(page).toHaveURL(/\/hoy$/)

    // Con el dedo no se enfoca solo (no salta el teclado).
    const composer = page.getByRole('textbox', { name: 'Anotar para hoy' })
    await expect(composer).not.toBeFocused()
    await composer.tap()
    await composer.fill(text)
    await page.getByRole('button', { name: 'Anotar', exact: true }).tap()
    await expect(region(page, 'Hoy').getByRole('button', { name: `Editar ${text}` })).toBeVisible()

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
    await expect.poll(async () => (await saved(page)).length).toBe(1)
  })
})
