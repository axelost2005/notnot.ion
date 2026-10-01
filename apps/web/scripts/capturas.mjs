// Capturas del README. Con la app levantada (`pnpm dev`): `pnpm --filter @notnot/web capturas`.
// Crea datos de ejemplo en la base de dev, saca las capturas y los borra.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const rootEnv = new URL('../../../.env', import.meta.url)
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const BASE = 'http://localhost:5173'
const OUT = new URL('../../../docs/capturas/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const api = await browser.newContext({ baseURL: BASE })
const unlock = await api.request.post('/api/unlock', { data: { code: process.env.APP_SECRET } })
if (unlock.status() !== 204)
  throw new Error('No se pudo desbloquear: revisá APP_SECRET y que la app esté levantada')
const cookies = await api.cookies()

const call = async (method, path, data) => {
  const res = await api.request.fetch(path, { method, data })
  if (!res.ok()) throw new Error(`${method} ${path}: ${res.status()}`)
  return res.status() === 204 ? null : res.json()
}

const created = []
const board = async (name, color) => {
  const b = await call('POST', '/api/boards', { name, color })
  created.push(b.id)
  return b
}

try {
  const lumen = await board('Estudio Lumen', 'blue')
  const cafe = await board('Café Altamira', 'amber')
  await board('Personal', 'green')

  const columns = async (b) => (await call('GET', `/api/boards/${b.id}`)).columns
  const [todo, doing, done] = await columns(lumen)
  for (const title of ['Revisar contrato con Lucía', 'Fotos de producto para la tienda'])
    await call('POST', '/api/tasks', { columnId: todo.id, title })
  await call('POST', '/api/tasks', {
    columnId: doing.id,
    title: 'Maqueta de la home',
    description: 'Versión mobile primero.',
  })
  await call('POST', '/api/tasks', { columnId: doing.id, title: 'Ajustar la paleta de colores' })
  for (const title of ['Kickoff con el equipo', 'Relevar la web actual'])
    await call('POST', '/api/tasks', { columnId: done.id, title })
  const [cafeTodo] = await columns(cafe)
  await call('POST', '/api/tasks', { columnId: cafeTodo.id, title: 'Menú nuevo para el verano' })

  await call('POST', '/api/notes', {
    boardId: lumen.id,
    content:
      'Llamada con Lucía\nQuieren lanzar antes de fin de mes.\n[] mandar presupuesto actualizado\n[] pedir accesos al hosting',
  })
  const note = await call('POST', '/api/notes', {
    boardId: lumen.id,
    content: `Ideas para la home\n[] probar el hero con video\n[] ver referencias de @${cafe.slug}\nhttps://lumen.studio/brief`,
  })
  await call('POST', `/api/tasks/${note.tasks[0].id}/toggle-done`)

  async function shoot(
    file,
    { width, height, dark = false, mobile = false, path = `/b/${lumen.slug}`, notes = true },
  ) {
    const context = await browser.newContext({
      baseURL: BASE,
      viewport: { width, height },
      deviceScaleFactor: 2,
      colorScheme: dark ? 'dark' : 'light',
      isMobile: mobile,
      hasTouch: mobile,
    })
    await context.addCookies(cookies)
    // El panel de notas abierto (o cerrado) en escritorio.
    await context.addInitScript(
      (open) => localStorage.setItem('notnot:notes-open', String(open)),
      notes,
    )
    const page = await context.newPage()
    await page.goto(path)
    // En mobile una de las dos vistas está oculta: alcanza con que estén cargadas.
    await page.getByText('Maqueta de la home').first().waitFor({ state: 'attached' })
    if (notes) await page.getByText('Ideas para la home').first().waitFor({ state: 'attached' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: fileURLToPath(new URL(file, OUT)) })
    await context.close()
    console.log(`docs/capturas/${file}`)
  }

  await shoot('escritorio-claro.png', { width: 1440, height: 860 })
  await shoot('escritorio-oscuro.png', { width: 1440, height: 860, dark: true })
  await shoot('escritorio-general.png', {
    width: 1440,
    height: 860,
    path: '/b/general',
    notes: false,
  })
  await shoot('mobile-tablero.png', { width: 390, height: 844, mobile: true })
  await shoot('mobile-notas.png', {
    width: 390,
    height: 844,
    mobile: true,
    path: `/b/${lumen.slug}?vista=notas`,
  })
} finally {
  for (const id of created) await call('DELETE', `/api/boards/${id}`)
  await browser.close()
}
