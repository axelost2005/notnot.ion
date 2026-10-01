import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { parseDayStart } from '../middleware/archive'
import { unlock } from '../testing'

// Solo candado y validaciones: cortan antes de tocar la base (sin X-Day-Start no se archiva).
const app = createApp()
let cookie: string

beforeAll(async () => {
  cookie = await unlock(app)
})

describe('GET /api/history', () => {
  it('sin cookie devuelve 401', async () => {
    const res = await request(app).get('/api/history')
    expect(res.status).toBe(401)
  })

  it.each(['?boardId=inbox', '?before=ayer'])('rechaza %s', async (query) => {
    const res = await request(app).get(`/api/history${query}`).set('Cookie', cookie)
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })
})

describe('parseDayStart', () => {
  const now = new Date('2026-10-01T15:00:00.000Z')

  it('acepta la medianoche del dispositivo', () => {
    expect(parseDayStart('2026-10-01T03:00:00.000Z', now)).toEqual(
      new Date('2026-10-01T03:00:00.000Z'),
    )
  })

  it.each<[string | undefined, string]>([
    [undefined, 'sin header'],
    ['ayer', 'algo que no es fecha'],
    ['2026-09-28T03:00:00.000Z', 'a más de 48 h para atrás'],
    ['2026-10-04T03:00:00.000Z', 'a más de 48 h para adelante'],
  ])('ignora %s (%s)', (value) => {
    expect(parseDayStart(value, now)).toBeNull()
  })
})
