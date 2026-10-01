import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { unlock } from '../testing'

// Solo candado y validaciones: cortan antes de tocar la base.
const app = createApp()
let cookie: string

beforeAll(async () => {
  cookie = await unlock(app)
})

const ID = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'

describe('candado', () => {
  it.each([
    ['get', `/api/boards/${ID}/notes`],
    ['post', '/api/notes'],
    ['delete', `/api/notes/${ID}`],
    ['post', `/api/tasks/${ID}/toggle-done`],
  ] as const)('%s %s sin cookie devuelve 401', async (method, path) => {
    const res = await request(app)[method](path)
    expect(res.status).toBe(401)
  })
})

describe('validaciones', () => {
  it.each<[Record<string, unknown>, string]>([
    [{ boardId: ID, content: '' }, 'contenido vacío'],
    [{ boardId: ID, content: ' \n \n ' }, 'solo espacios y saltos'],
    [{ boardId: ID, content: 'x'.repeat(5001) }, 'más de 5000'],
    [{ content: 'hola' }, 'sin tablero'],
    [{ boardId: 'inbox', content: 'hola' }, 'tablero que no es uuid'],
  ])('POST /api/notes rechaza %j (%s)', async (body) => {
    const res = await request(app).post('/api/notes').set('Cookie', cookie).send(body)
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })

  it('GET notes rechaza un cursor que no es uuid', async () => {
    const res = await request(app).get(`/api/boards/${ID}/notes?before=ayer`).set('Cookie', cookie)
    expect(res.status).toBe(400)
  })

  it('toggle-done rechaza un id que no es uuid', async () => {
    const res = await request(app).post('/api/tasks/123/toggle-done').set('Cookie', cookie)
    expect(res.status).toBe(400)
  })
})
