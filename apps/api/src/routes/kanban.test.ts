import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { unlock } from '../testing'

// Solo validaciones y candado: todas cortan antes de tocar la base.
const app = createApp()
let cookie: string

beforeAll(async () => {
  cookie = await unlock(app)
})

const ID = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'
const OTHER = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c'

type Case = [method: 'post' | 'patch' | 'delete', path: string, body?: Record<string, unknown>]

describe('candado', () => {
  it.each<Case>([
    ['post', `/api/boards/${ID}/columns`, { name: 'Revisión' }],
    ['patch', `/api/columns/${ID}`, { name: 'Revisión' }],
    ['delete', `/api/columns/${ID}`],
    ['post', '/api/tasks', { columnId: ID, title: 'Llamar' }],
    ['patch', `/api/tasks/${ID}`, { title: 'Llamar' }],
    ['delete', `/api/tasks/${ID}`],
    ['post', `/api/tasks/${ID}/move`, { columnId: ID }],
  ])('%s %s sin cookie devuelve 401', async (method, path, body) => {
    const res = await request(app)[method](path).send(body)
    expect(res.status).toBe(401)
  })
})

describe('validaciones', () => {
  it.each<Case>([
    ['post', `/api/boards/${ID}/columns`, { name: '' }],
    ['post', `/api/boards/${ID}/columns`, { name: 'x'.repeat(41) }],
    ['post', '/api/boards/123/columns', { name: 'Revisión' }],
    ['patch', `/api/columns/${ID}`, {}],
    ['patch', `/api/columns/${ID}`, { isDone: false }],
    ['delete', '/api/columns/no-es-uuid'],
    ['post', '/api/tasks', { title: 'Sin columna' }],
    ['post', '/api/tasks', { columnId: ID, title: '   ' }],
    ['post', '/api/tasks', { columnId: ID, title: 'x'.repeat(201) }],
    ['post', '/api/tasks', { columnId: ID, title: 'Ok', description: 'x'.repeat(5001) }],
    ['patch', `/api/tasks/${ID}`, {}],
    ['patch', `/api/tasks/${ID}`, { title: '' }],
    ['post', `/api/tasks/${ID}/move`, {}],
    ['post', `/api/tasks/${ID}/move`, { columnId: 'columna' }],
    ['post', `/api/tasks/${ID}/move`, { columnId: OTHER, prevId: 'arriba' }],
  ])('%s %s con %j devuelve 400', async (method, path, body) => {
    const res = await request(app)[method](path).set('Cookie', cookie).send(body)
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })

  it('una tarjeta no puede ser su propio vecino', async () => {
    const res = await request(app)
      .post(`/api/tasks/${ID}/move`)
      .set('Cookie', cookie)
      .send({ columnId: OTHER, prevId: ID })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'Una tarjeta no puede ser su propio vecino' },
    })
  })
})
