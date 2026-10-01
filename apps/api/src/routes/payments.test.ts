import { LIMITS } from '@notnot/shared'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { unlock } from '../testing'

// Solo candado y validaciones de Finanzas: todas cortan antes de tocar la base.
const app = createApp()
let cookie: string

beforeAll(async () => {
  cookie = await unlock(app)
})

const ID = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'
const VALID = { date: '2026-10-15', amountCents: 15_000_000, currency: 'ARS' }

type Case = [method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: object]

describe('candado', () => {
  it.each<Case>([
    ['get', '/api/payments?month=2026-10'],
    ['get', '/api/payments/summary'],
    ['post', '/api/payments', VALID],
    ['patch', `/api/payments/${ID}`, { amountCents: 100 }],
    ['delete', `/api/payments/${ID}`],
  ])('%s %s sin cookie devuelve 401', async (method, path, body) => {
    const res = await request(app)[method](path).send(body)
    expect(res.status).toBe(401)
  })

  it('los comprobantes tampoco se suben sin cookie', async () => {
    const res = await request(app)
      .post(`/api/payments/${ID}/images?width=10&height=10`)
      .set('Content-Type', 'image/png')
      .send(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    expect(res.status).toBe(401)
  })
})

describe('validaciones', () => {
  it.each<Case>([
    ['get', '/api/payments'],
    ['get', '/api/payments?month=2026-13'],
    ['get', '/api/payments?month=octubre'],
    ['post', '/api/payments', { ...VALID, amountCents: 0 }],
    ['post', '/api/payments', { ...VALID, amountCents: -500 }],
    ['post', '/api/payments', { ...VALID, amountCents: 10.5 }],
    ['post', '/api/payments', { ...VALID, amountCents: LIMITS.paymentAmountCents + 1 }],
    ['post', '/api/payments', { ...VALID, currency: 'EUR' }],
    ['post', '/api/payments', { ...VALID, date: '15/10/2026' }],
    ['post', '/api/payments', { ...VALID, date: '2026-02-30' }],
    ['post', '/api/payments', { ...VALID, boardId: 'pepito' }],
    ['post', '/api/payments', { ...VALID, category: 'x'.repeat(LIMITS.paymentCategory + 1) }],
    ['post', '/api/payments', { amountCents: 100, currency: 'ARS' }],
    ['patch', `/api/payments/${ID}`, {}],
    ['patch', '/api/payments/123', { amountCents: 100 }],
    ['delete', '/api/payments/123'],
  ])('%s %s con datos inválidos devuelve 400', async (method, path, body) => {
    const res = await request(app)[method](path).set('Cookie', cookie).send(body)
    expect(res.status).toBe(400)
  })

  it('un comprobante que no es una imagen, 400', async () => {
    const res = await request(app)
      .post(`/api/payments/${ID}/images?width=10&height=10`)
      .set('Cookie', cookie)
      .set('Content-Type', 'image/png')
      .send(Buffer.from('no soy un png'))
    expect(res.status).toBe(400)
  })
})
