import { LIMITS } from '@notnot/shared'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { unlock } from '../testing'

// Solo candado y validaciones de Por cobrar: todas cortan antes de tocar la base.
const app = createApp()
let cookie: string

beforeAll(async () => {
  cookie = await unlock(app)
})

const ID = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'
const VALID = {
  description: 'Desarrollo web, segundo 50%',
  amountCents: 30_000_000,
  currency: 'ARS',
}

type Case = [method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: object]

describe('candado', () => {
  it.each<Case>([
    ['get', '/api/receivables'],
    ['post', '/api/receivables', VALID],
    ['patch', `/api/receivables/${ID}`, { amountCents: 100 }],
    ['delete', `/api/receivables/${ID}`],
  ])('%s %s sin cookie devuelve 401', async (method, path, body) => {
    const res = await request(app)[method](path).send(body)
    expect(res.status).toBe(401)
  })
})

describe('validaciones', () => {
  it.each<Case>([
    ['post', '/api/receivables', { ...VALID, description: '   ' }],
    [
      'post',
      '/api/receivables',
      { ...VALID, description: 'x'.repeat(LIMITS.receivableDescription + 1) },
    ],
    ['post', '/api/receivables', { ...VALID, amountCents: 0 }],
    ['post', '/api/receivables', { ...VALID, amountCents: 10.5 }],
    ['post', '/api/receivables', { ...VALID, amountCents: LIMITS.paymentAmountCents + 1 }],
    ['post', '/api/receivables', { ...VALID, currency: 'EUR' }],
    ['post', '/api/receivables', { ...VALID, dueDate: '15/10/2026' }],
    ['post', '/api/receivables', { ...VALID, dueDate: '2026-02-30' }],
    ['post', '/api/receivables', { ...VALID, boardId: 'pepito' }],
    ['post', '/api/receivables', { ...VALID, note: 'x'.repeat(LIMITS.receivableNote + 1) }],
    ['post', '/api/receivables', { amountCents: 100, currency: 'ARS' }],
    ['patch', `/api/receivables/${ID}`, {}],
    ['patch', '/api/receivables/123', { amountCents: 100 }],
    ['delete', '/api/receivables/123'],
    // Un pago apunta a lo que me deben con un id válido.
    [
      'post',
      '/api/payments',
      { date: '2026-10-15', amountCents: 100, currency: 'ARS', receivableId: 'pepito' },
    ],
    ['patch', `/api/payments/${ID}`, { receivableId: 123 }],
  ])('%s %s con datos inválidos devuelve 400', async (method, path, body) => {
    const res = await request(app)[method](path).set('Cookie', cookie).send(body)
    expect(res.status).toBe(400)
  })
})
