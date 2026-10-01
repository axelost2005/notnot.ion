import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const CODE = process.env.APP_SECRET ?? ''

/** Nombre único con el prefijo `e2e-` para poder limpiar lo que crean los tests. */
export const e2eName = (label: string) => `e2e-${label}-${Date.now().toString(36)}`

/** Desbloquea con la API: `page.request` comparte las cookies con el navegador. */
export async function unlock(page: Page) {
  expect(CODE, 'Falta APP_SECRET en el .env de la raíz').not.toBe('')
  const res = await page.request.post('/api/unlock', { data: { code: CODE } })
  expect(res.status()).toBe(204)
}

type BoardRow = { id: string; name: string; slug: string }

export async function listBoards(request: APIRequestContext): Promise<BoardRow[]> {
  const res = await request.get('/api/boards')
  expect(res.ok()).toBe(true)
  return (await res.json()) as BoardRow[]
}

/** Borra los tableros que dejaron los tests (los que empiezan con `e2e-`). */
export async function deleteE2EBoards(request: APIRequestContext) {
  for (const board of await listBoards(request)) {
    if (board.name.startsWith('e2e-')) await request.delete(`/api/boards/${board.id}`)
  }
}

/** Borra las tarjetas de General que dejaron los tests (las que empiezan con `e2e-`). */
export async function deleteE2EGeneralTasks(request: APIRequestContext) {
  const general = (await listBoards(request)).find((board) => board.slug === 'general')
  if (!general) return
  const res = await request.get(`/api/boards/${general.id}`)
  const { tasks } = (await res.json()) as { tasks: { id: string; title: string }[] }
  for (const task of tasks) {
    if (task.title.startsWith('e2e-')) await request.delete(`/api/tasks/${task.id}`)
  }
}

/** Borra las notas de General que dejaron los tests (las que mencionan un tablero `e2e-`). */
export async function deleteE2ENotes(request: APIRequestContext) {
  const general = (await listBoards(request)).find((board) => board.slug === 'general')
  if (!general) return
  const res = await request.get(`/api/boards/${general.id}/notes`)
  const { notes } = (await res.json()) as { notes: { id: string; content: string }[] }
  for (const note of notes) {
    if (note.content.includes('@e2e-')) await request.delete(`/api/notes/${note.id}`)
  }
}

/** Borra las carpetas y notas de la sección Notas que dejaron los tests (prefijo `e2e-`). */
export async function deleteE2EPages(request: APIRequestContext) {
  const res = await request.get('/api/folders')
  const tree = (await res.json()) as {
    folders: { id: string; name: string }[]
    pages: { id: string; title: string }[]
  }
  for (const page of tree.pages) {
    if (page.title.startsWith('e2e-')) await request.delete(`/api/pages/${page.id}`)
  }
  for (const folder of tree.folders) {
    // Las de adentro ya pudieron irse con su carpeta.
    if (folder.name.startsWith('e2e-')) await request.delete(`/api/folders/${folder.id}`)
  }
}

/** Borra los pagos de un mes que dejaron los tests (categoría o descripción con `e2e-`). */
export async function deleteE2EPayments(request: APIRequestContext, month: string) {
  const res = await request.get(`/api/payments?month=${month}`)
  const payments = (await res.json()) as {
    id: string
    category: string | null
    description: string | null
  }[]
  for (const payment of payments) {
    const mark = `${payment.category ?? ''} ${payment.description ?? ''}`
    if (mark.includes('e2e-')) await request.delete(`/api/payments/${payment.id}`)
  }
}
