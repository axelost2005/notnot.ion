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
const folders = []
const payments = []
const receivables = []

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

  // Sección Notas: carpetas y una nota abierta.
  const clients = await call('POST', '/api/folders', { name: 'Clientes' })
  folders.push(clients.id)
  const lumenFolder = await call('POST', '/api/folders', {
    name: 'Estudio Lumen',
    parentId: clients.id,
  })
  await call('POST', '/api/folders', { name: 'Café Altamira', parentId: clients.id })
  const ideas = await call('POST', '/api/folders', { name: 'Ideas' })
  folders.push(ideas.id)
  const access = await call('POST', '/api/pages', {
    title: 'Accesos y datos del proyecto',
    folderId: lumenFolder.id,
  })
  await call('PATCH', `/api/pages/${access.id}`, {
    content: [
      'Hosting: el panel lo maneja Lucía; los accesos están en el gestor.',
      'Dominio: renueva en marzo.',
      '',
      'Contacto para facturas: administración, los martes.',
      'Paleta: azul #2D5BFF y crema #F6F1E7.',
    ].join('\n'),
  })
  await call('POST', '/api/pages', { title: 'Reunión de arranque', folderId: lumenFolder.id })
  await call('POST', '/api/pages', { title: 'Portfolio 2027', folderId: ideas.id })

  // Finanzas: lo que te deben (algunas con pagos) y los pagos del mes actual.
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const fromToday = (days) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const receivable = async (data) => {
    const r = await call('POST', '/api/receivables', data)
    receivables.push(r.id)
    return r
  }
  const redesign = await receivable({
    description: 'Rediseño de la web',
    amountCents: 90_000_000,
    currency: 'ARS',
    boardId: lumen.id,
    dueDate: fromToday(-3),
    note: 'La segunda mitad, contra entrega.',
  })
  const menu = await receivable({
    description: 'Menú del verano',
    amountCents: 6_000_000,
    currency: 'ARS',
    boardId: cafe.id,
    dueDate: fromToday(-10),
  })
  await receivable({
    description: 'Mantenimiento de noviembre',
    amountCents: 8_500_000,
    currency: 'ARS',
    boardId: lumen.id,
    dueDate: fromToday(5),
  })
  await receivable({
    description: 'Tienda online, entrega final',
    amountCents: 60_000,
    currency: 'USD',
    boardId: cafe.id,
    dueDate: fromToday(12),
  })
  await receivable({
    description: 'Fotos de producto',
    amountCents: 15_000_000,
    currency: 'ARS',
    boardId: cafe.id,
  })
  for (const payment of [
    {
      day: '03',
      amountCents: 45_000_000,
      currency: 'ARS',
      boardId: lumen.id,
      category: 'Diseño',
      description: 'Rediseño de la web, primera mitad',
      receivableId: redesign.id,
    },
    {
      day: '08',
      amountCents: 120_000,
      currency: 'USD',
      boardId: cafe.id,
      category: 'Desarrollo',
      description: 'Tienda online',
    },
    {
      day: '14',
      amountCents: 8_500_000,
      currency: 'ARS',
      boardId: lumen.id,
      category: 'Mantenimiento',
      description: null,
    },
    {
      day: '21',
      amountCents: 6_000_000,
      currency: 'ARS',
      boardId: cafe.id,
      category: 'Diseño',
      description: 'Menú del verano',
      receivableId: menu.id,
    },
  ]) {
    const { day, ...data } = payment
    payments.push(await call('POST', '/api/payments', { ...data, date: `${month}-${day}` }))
  }

  async function shoot(
    file,
    {
      width,
      height,
      dark = false,
      mobile = false,
      path = `/b/${lumen.slug}`,
      notes = true,
      waitFor = ['Maqueta de la home', ...(notes ? ['Ideas para la home'] : [])],
    },
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
    for (const text of waitFor) await page.getByText(text).first().waitFor({ state: 'attached' })
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
  await shoot('escritorio-notas.png', {
    width: 1440,
    height: 860,
    path: `/p/${access.id}`,
    waitFor: ['Reunión de arranque'],
  })
  await shoot('escritorio-finanzas.png', {
    width: 1440,
    height: 860,
    path: `/finanzas/${month}`,
    waitFor: ['Tienda online'],
  })
  await shoot('escritorio-por-cobrar.png', {
    width: 1440,
    height: 860,
    path: '/finanzas/por-cobrar',
    waitFor: ['Mantenimiento de noviembre'],
  })
  await shoot('mobile-tablero.png', { width: 390, height: 844, mobile: true })
  await shoot('mobile-notas.png', {
    width: 390,
    height: 844,
    mobile: true,
    path: `/b/${lumen.slug}?vista=notas`,
  })
} finally {
  for (const payment of payments) await call('DELETE', `/api/payments/${payment.id}`)
  for (const id of receivables) await call('DELETE', `/api/receivables/${id}`)
  for (const id of folders) await call('DELETE', `/api/folders/${id}`)
  for (const id of created) await call('DELETE', `/api/boards/${id}`)
  await browser.close()
}
