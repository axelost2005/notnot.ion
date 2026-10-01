import { expect, test, type Page } from '@playwright/test'
import { deleteE2EBoards, deleteE2EPayments, e2eName, unlock } from './helpers'

// Un mes lejano: los totales no se mezclan con otros pagos de la base de dev.
const MONTH = '2031-05'

/** Una "foto" del comprobante, hecha en el navegador. */
async function receipt(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 800
    const context = canvas.getContext('2d')!
    context.fillStyle = '#e9f5ee'
    context.fillRect(0, 0, 500, 800)
    context.fillStyle = '#1e7942'
    context.fillRect(40, 120, 420, 40)
    return canvas.toDataURL('image/png').split(',')[1]!
  })
  return { name: 'transferencia.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') }
}

const totals = (page: Page) => page.locator('dl')

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EPayments(page.request, MONTH)
  await deleteE2EBoards(page.request)
})

test('anota pagos en pesos y dólares, con cliente y comprobante; totales, categorías y meses', async ({
  page,
}) => {
  const client = e2eName('cliente')
  await page.request.post('/api/boards', { data: { name: client, color: 'blue' } })

  // `/finanzas` abre el mes actual; desde ahí, el mes del test.
  await page.goto('/finanzas')
  await expect(page).toHaveURL(/\/finanzas\/\d{4}-\d{2}$/)
  await page.goto(`/finanzas/${MONTH}`)
  await expect(page.getByText('No hay pagos anotados en mayo.')).toBeVisible()

  // En pesos, con cliente y el comprobante adjunto antes de guardar.
  await page.getByRole('button', { name: 'Anotar un pago' }).first().click()
  let dialog = page.getByRole('dialog', { name: 'Anotar un pago' })
  await expect(dialog.getByRole('textbox', { name: 'Monto' })).toBeFocused()
  await dialog.getByRole('textbox', { name: 'Monto' }).fill('150.000')
  await dialog.getByLabel('Fecha').fill(`${MONTH}-10`)
  await dialog.getByRole('combobox', { name: 'Cliente' }).click()
  await page.getByRole('option', { name: client }).click()
  await dialog.getByRole('textbox', { name: 'Categoría' }).fill('e2e-Diseño')
  await dialog.getByRole('textbox', { name: 'Descripción' }).fill('e2e-Logo y papelería')
  await dialog.getByLabel('Adjuntar imagen').setInputFiles(await receipt(page))
  await expect(dialog.getByRole('button', { name: 'Quitar la imagen 1' })).toBeAttached()
  const uploaded = page.waitForResponse(
    (r) => /\/api\/payments\/[^/]+\/images/.test(r.url()) && r.status() === 201,
  )
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await uploaded
  await expect(dialog).toBeHidden()

  // En dólares.
  await page.getByRole('button', { name: 'Anotar un pago' }).first().click()
  dialog = page.getByRole('dialog', { name: 'Anotar un pago' })
  await dialog.getByRole('textbox', { name: 'Monto' }).fill('1.200')
  await dialog.getByText('USD', { exact: true }).click()
  await expect(dialog.getByRole('radio', { name: 'USD' })).toBeChecked()
  await dialog.getByRole('textbox', { name: 'Categoría' }).fill('e2e-Hosting')
  await dialog.getByRole('textbox', { name: 'Descripción' }).fill('e2e-Servidor anual')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).toBeHidden()

  // La lista y los totales del mes, por moneda.
  const logo = page.getByRole('button', { name: /e2e-Logo y papelería/ })
  await expect(logo).toContainText(client)
  await expect(logo).toContainText('$ 150.000')
  await expect(logo).toContainText('1 comprobante')
  await expect(page.getByRole('button', { name: /e2e-Servidor anual/ })).toContainText('US$ 1.200')
  await expect(totals(page)).toContainText('Cobrado en pesos · 1 pago')
  await expect(totals(page)).toContainText('$ 150.000')
  await expect(totals(page)).toContainText('Cobrado en dólares · 1 pago')
  await expect(totals(page)).toContainText('US$ 1.200')

  // Agrupados por categoría, con su subtotal.
  await page.getByRole('button', { name: 'Por categoría' }).click()
  await expect(page).toHaveURL(/por=categoria/)
  const design = page.getByRole('region', { name: 'e2e-Diseño' })
  await expect(design.getByRole('heading', { name: 'e2e-Diseño' })).toBeVisible()
  await expect(design).toContainText('$ 150.000')
  await expect(page.getByRole('region', { name: 'e2e-Hosting' })).toContainText('US$ 1.200')

  // Otro mes y de vuelta (la vista por categoría se mantiene).
  await page.getByRole('link', { name: 'Mes siguiente' }).click()
  await expect(page).toHaveURL(/\/finanzas\/2031-06\?por=categoria$/)
  await expect(page.getByText('No hay pagos anotados en junio.')).toBeVisible()
  await page.getByRole('link', { name: 'Mes anterior' }).click()
  await expect(page.getByRole('region', { name: 'e2e-Diseño' })).toBeVisible()
  await page.getByRole('button', { name: 'Por fecha' }).click()

  // Editar uno: el comprobante sigue ahí.
  await logo.click()
  dialog = page.getByRole('dialog', { name: 'Pago' })
  await expect(dialog.getByRole('button', { name: 'Ver la imagen 1' })).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Monto' }).fill('175.000,50')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).toBeHidden()
  await expect(totals(page)).toContainText('$ 175.000,50')

  // Borrar el otro.
  await page.getByRole('button', { name: /e2e-Servidor anual/ }).click()
  await dialog.getByRole('button', { name: 'Borrar pago' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar pago' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: /e2e-Servidor anual/ })).toHaveCount(0)
  await expect(totals(page)).not.toContainText('dólares')

  // Sigue después de recargar.
  await page.reload()
  await expect(page.getByRole('button', { name: /e2e-Logo y papelería/ })).toContainText(
    '$ 175.000,50',
  )
})

test('un monto que no se entiende no se guarda', async ({ page }) => {
  await page.goto(`/finanzas/${MONTH}`)
  await page.getByRole('button', { name: 'Anotar un pago' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Anotar un pago' })
  await dialog.getByRole('textbox', { name: 'Monto' }).fill('mil pesos')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog.getByRole('alert')).toHaveText(
    'Escribí un monto, por ejemplo 150.000 o 1.234,50',
  )
  await expect(dialog).toBeVisible()
})
