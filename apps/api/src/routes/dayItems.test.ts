import { LIMITS } from '@notnot/shared'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { unlock } from '../testing'

// Solo candado y validaciones de Hoy: todas cortan antes de tocar la base.
const app = createApp()
let cookie: string

beforeAll(async () => {
  cookie = await unlock(app)
})

const ID = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'

type Case = [method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: object]

describe('candado', () => {
  it.each<Case>([
    ['get', '/api/day-items'],
    ['post', '/api/day-items', { day: '2026-10-05', text: 'pagar la luz' }],
    ['patch', `/api/day-items/${ID}`, { done: true }],
    ['delete', `/api/day-items/${ID}`],
  ])('%s %s sin cookie devuelve 401', async (method, path, body) => {
    const res = await request(app)[method](path).send(body)
    expect(res.status).toBe(401)
  })
})

describe('validaciones', () => {
  const lines = (count: number) => Array.from({ length: count }, (_, i) => `cosa ${i}`).join('\n')

  it.each<Case>([
    ['post', '/api/day-items', { text: 'pagar la luz' }],
    ['post', '/api/day-items', { day: 'hoy', text: 'pagar la luz' }],
    ['post', '/api/day-items', { day: '2026-02-30', text: 'pagar la luz' }],
    ['post', '/api/day-items', { day: '2026-10-05', text: '' }],
    ['post', '/api/day-items', { day: '2026-10-05', text: ' \n - \n [ ] ' }],
    ['post', '/api/day-items', { day: '2026-10-05', text: lines(LIMITS.dayItemsPerPost + 1) }],
    ['patch', `/api/day-items/${ID}`, {}],
    ['patch', `/api/day-items/${ID}`, { text: '   ' }],
    ['patch', `/api/day-items/${ID}`, { text: 'x'.repeat(LIMITS.dayItemText + 1) }],
    ['patch', `/api/day-items/${ID}`, { day: 'mañana' }],
    ['patch', `/api/day-items/${ID}`, { done: 'si' }],
    ['patch', '/api/day-items/123', { done: true }],
    ['delete', '/api/day-items/123'],
  ])('%s %s con datos inválidos devuelve 400', async (method, path, body) => {
    const res = await request(app)[method](path).set('Cookie', cookie).send(body)
    expect(res.status).toBe(400)
  })

  it('dice cuántas se pueden anotar de una vez', async () => {
    const res = await request(app)
      .post('/api/day-items')
      .set('Cookie', cookie)
      .send({ day: '2026-10-05', text: lines(LIMITS.dayItemsPerPost + 1) })
    expect(res.body).toEqual({
      error: { code: 'BAD_REQUEST', message: `Hasta ${LIMITS.dayItemsPerPost} por vez` },
    })
  })
})
