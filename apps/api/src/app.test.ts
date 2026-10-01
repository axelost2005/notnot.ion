import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app'

const app = createApp()

describe('GET /api/health', () => {
  it('responde ok y no se cachea', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
    expect(res.get('Cache-Control')).toBe('no-store')
  })
})

describe('errores', () => {
  it('un JSON mal formado devuelve 400 con el formato de error', async () => {
    const res = await request(app)
      .post('/api/unlock')
      .set('Content-Type', 'application/json')
      .send('{ roto')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'El cuerpo del pedido no es válido' },
    })
  })
})
