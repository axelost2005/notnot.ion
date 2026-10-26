import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  deleteE2EBoards,
  deleteE2EPayments,
  deleteE2EReceivables,
  e2eName,
  unlock,
} from './helpers'

const pad = (n: number) => String(n).padStart(2, '0')

/** Un día desde hoy, en el reloj del dispositivo (como la app): "2026-10-01". */
function day(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const thisMonth = day(0).slice(0, 7)

/** La fila de algo por cobrar (la abre su primer botón; "Me pagaron" es el otro). */
const row = (scope: Page | Locator, text: string) =>
  scope.getByRole('listitem').filter({ hasText: text })

type Currency = 'ARS' | 'USD'
type Owed = {
  description: string
  amountCents: number
  paidCents: number
  currency: Currency
  dueDate: string | null
}

/** Lo pendiente que ya había (no de los tests): la base de dev tiene datos de verdad. */
async function othersPending(page: Page) {
  const res = await page.request.get('/api/receivables')
  return ((await res.json()) as Owed[]).filter(
    (r) => !r.description.includes('e2e-') && r.paidCents < r.amountCents,
  )
}

const remaining = (owed: Owed[]) => owed.reduce((sum, r) => sum + r.amountCents - r.paidCents, 0)

/** "$ 300.000", "US$ 1.200": como lo muestra la app. */
const money = (cents: number, currency: Currency) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)

const pendingLabel = (count: number) => `${count} ${count === 1 ? 'pendiente' : 'pendientes'}`

/** El nombre del cuadrado de Finanzas termina con las vencidas: "… por cobrar, 2 vencidas". */
const dueSuffix = (count: number) =>
  new RegExp(`por cobrar${count ? `, ${count} ${count === 1 ? 'vencida' : 'vencidas'}` : ''}$`)

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EReceivables(page.request)
  await deleteE2EPayments(page.request, thisMonth)
  await deleteE2EBoards(page.request)
})

test('anota lo que te deben, registra lo que te pagan en partes y vincula un pago suelto', async ({
  page,
}) => {
  const client = e2eName('cliente')
  await page.request.post('/api/boards', { data: { name: client, color: 'teal' } })
  // Los totales y los números suman lo que ya había.
  const others = await othersPending(page)
  const ars = others.filter((r) => r.currency === 'ARS')
  const usd = others.filter((r) => r.currency === 'USD')
  const othersDue = others.filter((r) => r.dueDate !== null && r.dueDate <= day(0)).length
  const financeTile = page.getByRole('link', { name: /^Finanzas:/ })

  await page.goto('/finanzas')
  await page.getByRole('link', { name: /^Por cobrar/ }).click()
  await expect(page).toHaveURL(/\/finanzas\/por-cobrar$/)
  if (others.length === 0) await expect(page.getByText('No te deben nada.')).toBeVisible()

  // Una vencida hace tres días, con cliente.
  await page.getByRole('button', { name: 'Anotar lo que te deben' }).first().click()
  let dialog = page.getByRole('dialog', { name: 'Anotar lo que te deben' })
  await expect(dialog.getByRole('textbox', { name: 'Concepto' })).toBeFocused()
  await dialog.getByRole('textbox', { name: 'Concepto' }).fill('e2e-Desarrollo web, segundo 50%')
  await dialog.getByRole('textbox', { name: 'Monto' }).fill('300.000')
  await dialog.getByLabel('Vence').fill(day(-3))
  await dialog.getByRole('combobox', { name: 'Cliente' }).click()
  await page.getByRole('option', { name: client }).click()
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).toBeHidden()

  // Otra sin fecha, en dólares.
  await page.getByRole('button', { name: 'Anotar lo que te deben' }).first().click()
  dialog = page.getByRole('dialog', { name: 'Anotar lo que te deben' })
  await dialog.getByRole('textbox', { name: 'Concepto' }).fill('e2e-Mantenimiento anual')
  await dialog.getByRole('textbox', { name: 'Monto' }).fill('1.200')
  await dialog.getByText('USD', { exact: true }).click()
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).toBeHidden()

  // Lo que te deben por moneda, la vencida primero y marcada, y el número de la pestaña.
  const totals = page.locator('dl')
  await expect(totals).toContainText(`Te deben en pesos · ${pendingLabel(ars.length + 1)}`)
  await expect(totals).toContainText(money(remaining(ars) + 30_000_000, 'ARS'))
  await expect(totals).toContainText(`Te deben en dólares · ${pendingLabel(usd.length + 1)}`)
  await expect(totals).toContainText(money(remaining(usd) + 120_000, 'USD'))
  const groups = page.locator('section[aria-label] > h2')
  await expect(groups.first()).toHaveText('Vencidas')
  await expect(groups.last()).toHaveText('Sin fecha')
  const overdue = row(page.getByRole('region', { name: 'Vencidas' }), 'e2e-Desarrollo web')
  await expect(overdue.getByText('venció hace 3 días')).toHaveClass(/text-destructive/)
  await expect(overdue).toContainText(client)
  await expect(page.getByRole('region', { name: 'Sin fecha' })).toContainText(
    'e2e-Mantenimiento anual',
  )
  await expect(page.getByRole('link', { name: /^Por cobrar/ })).toContainText(
    String(others.length + 2),
  )

  // En el Inicio, el cuadrado de Finanzas la cuenta entre las vencidas; y de ahí se vuelve.
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/$/)
  await expect(financeTile).toHaveAccessibleName(dueSuffix(othersDue + 1))
  await financeTile.click()
  await page.getByRole('link', { name: /^Por cobrar/ }).click()

  // "Me pagaron" una parte: el pago viene completo con lo que falta y queda el resto.
  const web = row(page, 'e2e-Desarrollo web')
  await web.getByRole('button', { name: /^Me pagaron/ }).click()
  dialog = page.getByRole('dialog', { name: 'Anotar un pago' })
  await expect(dialog.getByRole('textbox', { name: 'Monto' })).toHaveValue('300.000')
  await expect(dialog.getByRole('combobox', { name: 'Cliente' })).toContainText(client)
  await expect(dialog.getByRole('combobox', { name: 'Por cobrar' })).toContainText(
    'e2e-Desarrollo web, segundo 50%',
  )
  await expect(dialog.getByRole('radio', { name: 'USD' })).toBeDisabled()
  await dialog.getByRole('textbox', { name: 'Monto' }).fill('100.000')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).toBeHidden()
  await expect(web).toContainText('$ 200.000')
  await expect(web).toContainText('de $ 300.000')
  await expect(totals).toContainText(money(remaining(ars) + 20_000_000, 'ARS'))

  // El pago está en Cobrado, en el mes de hoy.
  await page.getByRole('link', { name: 'Cobrado' }).click()
  await expect(page).toHaveURL(new RegExp(`/finanzas/${thisMonth}$`))
  await expect(page.getByRole('button', { name: /e2e-Desarrollo web/ })).toContainText('$ 100.000')

  // Y después el resto: pasa a las cobradas, con sus dos pagos.
  await page.getByRole('link', { name: /^Por cobrar/ }).click()
  await web.getByRole('button', { name: /^Me pagaron/ }).click()
  dialog = page.getByRole('dialog', { name: 'Anotar un pago' })
  await expect(dialog.getByRole('textbox', { name: 'Monto' })).toHaveValue('200.000')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    row(page.getByRole('region', { name: 'Vencidas' }), 'e2e-Desarrollo web'),
  ).toHaveCount(0)
  await page.getByRole('button', { name: /^Cobradas/ }).click()
  await web.getByRole('button').first().click()
  dialog = page.getByRole('dialog', { name: 'Por cobrar' })
  const payments = dialog.getByRole('region', { name: 'Pagos' })
  await expect(payments).toContainText('Cobrada')
  await expect(payments.getByRole('listitem')).toHaveCount(2)
  await expect(payments).toContainText('$ 100.000')
  await expect(payments).toContainText('$ 200.000')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()

  // Un pago anotado aparte se vincula desde su formulario.
  await page.request.post('/api/payments', {
    data: { date: day(0), amountCents: 40_000, currency: 'USD', description: 'e2e-Pago suelto' },
  })
  await page.getByRole('link', { name: 'Cobrado' }).click()
  await page.getByRole('button', { name: /e2e-Pago suelto/ }).click()
  dialog = page.getByRole('dialog', { name: 'Pago' })
  await dialog.getByRole('combobox', { name: 'Por cobrar' }).click()
  await page.getByRole('option', { name: /e2e-Mantenimiento anual/ }).click()
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('link', { name: /^Por cobrar/ }).click()
  const maintenance = row(page, 'e2e-Mantenimiento anual')
  await expect(maintenance).toContainText('US$ 800')
  await expect(maintenance).toContainText('de US$ 1.200')

  // Editar la otra: con fecha, pasa a "Por vencer".
  await maintenance.getByRole('button').first().click()
  dialog = page.getByRole('dialog', { name: 'Por cobrar' })
  await dialog.getByRole('textbox', { name: 'Concepto' }).fill('e2e-Mantenimiento anual del server')
  await dialog.getByLabel('Vence').fill(day(10))
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).toBeHidden()
  const upcoming = page.getByRole('region', { name: 'Por vencer' })
  await expect(upcoming).toContainText('e2e-Mantenimiento anual del server')
  await expect(upcoming).toContainText('vence en 10 días')

  // Borrarla: su pago queda en Cobrado, suelto.
  await row(page, 'e2e-Mantenimiento anual del server').getByRole('button').first().click()
  await dialog.getByRole('button', { name: 'Borrar' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('e2e-Mantenimiento anual del server')).toHaveCount(0)
  await page.getByRole('link', { name: 'Cobrado' }).click()
  await expect(page.getByRole('button', { name: /e2e-Pago suelto/ })).toContainText('US$ 400')

  // Sigue todo después de recargar.
  await page.goto('/finanzas/por-cobrar')
  await page.getByRole('button', { name: /^Cobradas/ }).click()
  await expect(web).toContainText('$ 300.000')

  // Cobrada, ya no cuenta entre las vencidas del cuadrado de Finanzas.
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/$/)
  await expect(financeTile).toHaveAccessibleName(dueSuffix(othersDue))
})

test('en el celu se ve entero y "Me pagaron" abre el pago', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.request.post('/api/receivables', {
    data: {
      description: 'e2e-Un concepto largo para ver que nada se sale de la pantalla del celu',
      amountCents: 123_456_789,
      currency: 'ARS',
      dueDate: day(-40),
    },
  })
  await page.goto('/finanzas/por-cobrar')
  const long = row(page, 'e2e-Un concepto largo')
  await expect(long.getByText('venció hace 40 días')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
  await long.getByRole('button', { name: /^Me pagaron/ }).click()
  await expect(page.getByRole('dialog', { name: 'Anotar un pago' })).toBeVisible()
})

test('sin concepto o con un monto que no se entiende no se guarda', async ({ page }) => {
  await page.goto('/finanzas/por-cobrar')
  await page.getByRole('button', { name: 'Anotar lo que te deben' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Anotar lo que te deben' })
  await dialog.getByRole('textbox', { name: 'Monto' }).fill('mucho')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog.getByRole('alert')).toHaveText([
    'Escribí qué te deben',
    'Escribí un monto, por ejemplo 150.000 o 1.234,50',
  ])
  await expect(dialog).toBeVisible()
})
