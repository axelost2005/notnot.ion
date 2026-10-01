import { expect, test } from '@playwright/test'

test('la home muestra el estado de la API', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'notnot.ion' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('API ok')
})
