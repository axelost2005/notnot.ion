import { LIMITS } from '@notnot/shared'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { detectImageType } from '../services/images'
import { unlock } from '../testing'

// Solo candado y validaciones: todas cortan antes de tocar la base o el store.
const app = createApp()
let cookie: string

beforeAll(async () => {
  cookie = await unlock(app)
})

const ID = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
])

describe('detectImageType', () => {
  it('reconoce WebP, JPEG y PNG por sus primeros bytes', () => {
    expect(detectImageType(WEBP)).toBe('image/webp')
    expect(detectImageType(JPEG)).toBe('image/jpeg')
    expect(detectImageType(PNG)).toBe('image/png')
  })

  it('lo demás no es una imagen', () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull()
    expect(detectImageType(Buffer.from('RIFF....WAVE'))).toBeNull()
    expect(detectImageType(new Uint8Array())).toBeNull()
  })
})

describe('candado', () => {
  it('sin cookie no se sube, no se ve ni se borra nada', async () => {
    const upload = await request(app)
      .post(`/api/tasks/${ID}/images?width=10&height=10`)
      .set('Content-Type', 'image/png')
      .send(PNG)
    expect(upload.status).toBe(401)
    expect((await request(app).get(`/api/images/${ID}`)).status).toBe(401)
    expect((await request(app).delete(`/api/images/${ID}`)).status).toBe(401)
  })
})

describe('validaciones al subir', () => {
  const upload = (query: string, type: string, body: Buffer | string) =>
    request(app)
      .post(`/api/tasks/${ID}/images${query}`)
      .set('Cookie', cookie)
      .set('Content-Type', type)
      .send(body)

  it('sin medidas o con medidas fuera de rango, 400', async () => {
    expect((await upload('', 'image/png', PNG)).status).toBe(400)
    expect((await upload('?width=0&height=10', 'image/png', PNG)).status).toBe(400)
    const tooWide = `?width=${LIMITS.imageMaxSide + 1}&height=10`
    expect((await upload(tooWide, 'image/png', PNG)).status).toBe(400)
  })

  it('lo que no es una imagen (por tipo o por contenido), 400', async () => {
    expect((await upload('?width=10&height=10', 'text/plain', 'hola')).status).toBe(400)
    expect((await upload('?width=10&height=10', 'image/svg+xml', '<svg/>')).status).toBe(400)
    const fake = await upload('?width=10&height=10', 'image/png', Buffer.from('no soy un png'))
    expect(fake.status).toBe(400)
    expect(fake.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'Mandá una imagen WebP, JPEG o PNG' },
    })
  })

  it('más grande que el límite, 413', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(LIMITS.imageBytes)])
    const res = await upload('?width=10&height=10', 'image/png', big)
    expect(res.status).toBe(413)
    expect(res.body).toMatchObject({ error: { code: 'TOO_LARGE' } })
  })

  it('un id que no es UUID, 400', async () => {
    const res = await request(app)
      .post('/api/tasks/123/images?width=10&height=10')
      .set('Cookie', cookie)
      .set('Content-Type', 'image/png')
      .send(PNG)
    expect(res.status).toBe(400)
    expect((await request(app).get('/api/images/123').set('Cookie', cookie)).status).toBe(400)
  })
})
