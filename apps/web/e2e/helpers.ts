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
