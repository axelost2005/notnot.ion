import { expect, test } from '@playwright/test'
import { unlock } from './helpers'

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test('el atajo "Nueva nota" abre General en Notas con el composer listo', async ({ page }) => {
  await page.goto('/?nueva-nota')
  await expect(page).toHaveURL(/\/b\/general\?vista=notas&escribir=1$/)
  await expect(page.getByRole('combobox', { name: 'Nueva nota en General' })).toBeFocused()
})

test('sin conexión aparece el aviso y se va al volver', async ({ page, context }) => {
  await page.goto('/b/general')
  await expect(page.getByRole('heading', { level: 1, name: 'General' })).toBeVisible()

  await context.setOffline(true)
  const banner = page.getByRole('status').filter({ hasText: 'Sin conexión' })
  await expect(banner).toBeVisible()

  await context.setOffline(false)
  await expect(banner).toBeHidden()
})
