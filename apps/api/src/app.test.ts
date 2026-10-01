import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app'

const app = createApp()

describe('GET /api/health', () => {
  it('responde ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('errores', () => {
  it('una ruta desconocida de /api devuelve 404 con el formato de error', async () => {
    const res = await request(app).get('/api/no-existe')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } })
  })

  it('un JSON mal formado devuelve 400', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{ roto')
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })
})
