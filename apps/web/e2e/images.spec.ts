import { expect, test, type Page } from '@playwright/test'
import { deleteE2EBoards, e2eName, unlock } from './helpers'

type Uploaded = { id: string; width: number; height: number }

/** Una "foto" PNG hecha en el navegador. */
async function makePng(page: Page, width: number, height: number, color: string) {
  const base64 = await page.evaluate(
    ({ width, height, color }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')!
      context.fillStyle = color
      context.fillRect(0, 0, width, height)
      context.fillStyle = '#ffffff'
      context.fillRect(width / 4, height / 4, width / 2, height / 2)
      return canvas.toDataURL('image/png').split(',')[1]!
    },
    { width, height, color },
  )
  return Buffer.from(base64, 'base64')
}

const uploaded = (page: Page) =>
  page.waitForResponse((r) => /\/api\/tasks\/[^/]+\/images/.test(r.url()) && r.status() === 201)

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

test.afterEach(async ({ page }) => {
  await deleteE2EBoards(page.request)
})

test('adjunta imágenes con el botón y pegando, las agranda, son privadas y se borran', async ({
  page,
  playwright,
}) => {
  const board = (await (
    await page.request.post('/api/boards', { data: { name: e2eName('imagenes'), color: 'teal' } })
  ).json()) as { id: string; slug: string }
  const detail = (await (await page.request.get(`/api/boards/${board.id}`)).json()) as {
    columns: { id: string }[]
  }
  await page.request.post('/api/tasks', {
    data: { columnId: detail.columns[0]!.id, title: 'presupuesto con fotos' },
  })
  await page.goto(`/b/${board.slug}`)
  await page.getByRole('button', { name: 'presupuesto con fotos', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Tarjeta' })

  // Con el botón (el input de archivo): se achica a 2000 px y se pasa a WebP antes de subir.
  let response = uploaded(page)
  await dialog.getByLabel('Adjuntar imagen').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: await makePng(page, 2400, 1600, '#2f6f8f'),
  })
  const first = (await (await response).json()) as Uploaded
  expect(first).toMatchObject({ width: 2000, height: 1333 })
  expect((await response).request().headers()['content-type']).toBe('image/webp')
  await expect(dialog.getByRole('button', { name: 'Ver la imagen 1' })).toBeVisible()

  // Pegando con Ctrl+V sobre la descripción: se adjunta y no se pega nada en el texto.
  const description = dialog.getByLabel('Descripción')
  await description.focus()
  response = uploaded(page)
  const pasted = (await makePng(page, 600, 400, '#a33f3f')).toString('base64')
  await page.evaluate((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    const data = new DataTransfer()
    data.items.add(new File([bytes], 'captura.png', { type: 'image/png' }))
    document.activeElement!.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    )
  }, pasted)
  const second = (await (await response).json()) as Uploaded
  expect(second).toMatchObject({ width: 600, height: 400 })
  await expect(dialog.getByRole('button', { name: 'Ver la imagen 2' })).toBeVisible()
  await expect(description).toHaveValue('')

  // Al tocarla se agranda (sin ocupar toda la pantalla) y Esc la cierra.
  const thumb = dialog.getByRole('button', { name: 'Ver la imagen 1' })
  const thumbWidth = (await thumb.boundingBox())!.width
  await thumb.click()
  const viewer = page.getByRole('dialog', { name: 'Imagen' })
  const big = viewer.locator('img')
  await expect(big).toBeVisible()
  await expect
    .poll(async () => (await big.boundingBox())?.width ?? 0)
    .toBeGreaterThan(thumbWidth * 4)
  expect((await big.boundingBox())!.width).toBeLessThan(page.viewportSize()!.width)
  await page.keyboard.press('Escape')
  await expect(viewer).toBeHidden()
  await expect(dialog).toBeVisible()

  // Siguen ahí después de recargar.
  await page.reload()
  await expect(dialog.getByRole('button', { name: 'Ver la imagen 2' })).toBeVisible()

  // Son privadas: sin la cookie del candado no se ven.
  const stranger = await playwright.request.newContext({ baseURL: 'http://localhost:5173' })
  expect((await stranger.get(`/api/images/${first.id}`)).status()).toBe(401)
  await stranger.dispose()
  const own = await page.request.get(`/api/images/${first.id}`)
  expect(own.status()).toBe(200)
  expect(own.headers()['cache-control']).toBe('private, max-age=31536000, immutable')

  // Borrar pide confirmación y la saca.
  await dialog.getByRole('button', { name: 'Borrar la imagen 1' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar imagen' }).click()
  await expect(dialog.getByRole('button', { name: 'Ver la imagen 2' })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Ver la imagen 1' })).toBeVisible()
  await expect
    .poll(async () => (await page.request.get(`/api/images/${first.id}`)).status())
    .toBe(404)
})
