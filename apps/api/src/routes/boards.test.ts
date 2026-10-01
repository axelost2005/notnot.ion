import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { unlock } from '../testing'

// Solo validaciones: todas cortan antes de tocar la base.
const app = createApp()
let cookie: string

beforeAll(async () => {
  cookie = await unlock(app)
})

const ID = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'

describe('POST /api/boards', () => {
  it.each<[Record<string, unknown>, string]>([
    [{ name: '', color: 'blue' }, 'nombre vacío'],
    [{ name: '   ', color: 'blue' }, 'nombre con solo espacios'],
    [{ name: 'x'.repeat(41), color: 'blue' }, 'nombre de más de 40'],
    [{ name: 'Pepito', color: 'fucsia' }, 'color fuera de la paleta'],
    [{ name: 'Pepito' }, 'sin color'],
    [{}, 'sin nada'],
  ])('rechaza %j (%s) con 400', async (body) => {
    const res = await request(app).post('/api/boards').set('Cookie', cookie).send(body)
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })
})

describe('PATCH /api/boards/:id', () => {
  it('rechaza un body vacío', async () => {
    const res = await request(app).patch(`/api/boards/${ID}`).set('Cookie', cookie).send({})
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'No hay nada para cambiar' },
    })
  })

  it('rechaza un nombre de más de 40', async () => {
    const res = await request(app)
      .patch(`/api/boards/${ID}`)
      .set('Cookie', cookie)
      .send({ name: 'x'.repeat(41) })
    expect(res.status).toBe(400)
  })

  it('rechaza archived que no es booleano', async () => {
    const res = await request(app)
      .patch(`/api/boards/${ID}`)
      .set('Cookie', cookie)
      .send({ archived: 'sí' })
    expect(res.status).toBe(400)
  })

  it('rechaza un id que no es uuid', async () => {
    const res = await request(app)
      .patch('/api/boards/no-es-uuid')
      .set('Cookie', cookie)
      .send({ name: 'Pepito' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/boards/:id', () => {
  it('sin cookie devuelve 401', async () => {
    const res = await request(app).delete(`/api/boards/${ID}`)
    expect(res.status).toBe(401)
  })

  it('rechaza un id que no es uuid', async () => {
    const res = await request(app).delete('/api/boards/123').set('Cookie', cookie)
    expect(res.status).toBe(400)
  })
})
