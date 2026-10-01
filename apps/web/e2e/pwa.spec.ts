import { expect, test } from '@playwright/test'

type Manifest = {
  name: string
  short_name: string
  display: string
  start_url: string
  icons: { src: string; sizes: string; purpose?: string }[]
  shortcuts: { name: string; url: string }[]
}

test('el build de producción es instalable', async ({ page }) => {
  await page.goto('/')

  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const manifest = (await (await page.request.get(href!)).json()) as Manifest
  expect(manifest).toMatchObject({
    name: 'notnot.ion',
    short_name: 'notnot',
    display: 'standalone',
    start_url: '/',
  })
  expect(manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose ?? 'any'}`)).toEqual(
    expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']),
  )
  for (const icon of manifest.icons) {
    expect((await page.request.get(`/${icon.src}`)).ok(), icon.src).toBe(true)
  }
  expect(manifest.shortcuts).toEqual([
    expect.objectContaining({ name: 'Nueva nota', url: '/?nueva-nota' }),
  ])
  expect((await page.request.get('/apple-touch-icon-180x180.png')).ok()).toBe(true)

  // Service worker activo y controlando la página.
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(scope).toBe(`${new URL(page.url()).origin}/`)
  await page.reload()
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)

  // El mismo chequeo que hace Chrome antes de ofrecer instalarla.
  const cdp = await page.context().newCDPSession(page)
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  expect(installabilityErrors).toEqual([])
})

test('la API va siempre por red: el service worker no la reemplaza por la app', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => navigator.serviceWorker.ready)
  await page.reload()

  const health = await page.evaluate(async () => {
    const res = await fetch('/api/health')
    return { type: res.headers.get('content-type'), body: (await res.json()) as unknown }
  })
  expect(health.type).toContain('application/json')
  expect(health.body).toEqual({ status: 'ok' })

  // Una navegación a /api tampoco cae en el fallback de la SPA.
  const res = await page.goto('/api/boards')
  expect(res?.headers()['content-type']).toContain('application/json')
})
