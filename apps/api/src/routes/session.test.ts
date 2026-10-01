import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { SESSION_COOKIE } from '../middleware/session'
import { TEST_CODE as CODE, unlock as unlockedCookie } from '../testing'

describe('POST /api/unlock', () => {
  it('con el código correcto setea una cookie httpOnly, firmada y de 1 año', async () => {
    const res = await request(createApp()).post('/api/unlock').send({ code: CODE })
    expect(res.status).toBe(204)
    const cookie = res.get('Set-Cookie')?.[0] ?? ''
    expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE}=s%3A`))
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain(`Max-Age=${365 * 24 * 60 * 60}`)
  })

  it('perdona mayúsculas, acentos y espacios de más', async () => {
    const res = await request(createApp())
      .post('/api/unlock')
      .send({ code: '  Caballo  BATERÍA grapa correcta ' })
    expect(res.status).toBe(204)
  })

  it('con un código incorrecto devuelve 401 y no setea cookie', async () => {
    const res = await request(createApp()).post('/api/unlock').send({ code: 'otra cosa' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({
      error: { code: 'INVALID_CODE', message: 'El código no es correcto' },
    })
    expect(res.get('Set-Cookie')).toBeUndefined()
  })

  it('sin código devuelve 400', async () => {
    const res = await request(createApp()).post('/api/unlock').send({})
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })

  it('después de 5 intentos fallidos corta con 429', async () => {
    const app = createApp()
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/unlock').send({ code: 'mal' })
      expect(res.status).toBe(401)
    }
    const blocked = await request(app).post('/api/unlock').send({ code: CODE })
    expect(blocked.status).toBe(429)
    expect(blocked.body).toMatchObject({ error: { code: 'TOO_MANY_ATTEMPTS' } })
  })

  it('los intentos correctos no cuentan para el límite', async () => {
    const app = createApp()
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post('/api/unlock').send({ code: CODE })
      expect(res.status).toBe(204)
    }
  })
})

describe('candado', () => {
  it('/api/health no necesita cookie', async () => {
    const res = await request(createApp()).get('/api/health')
    expect(res.status).toBe(200)
  })

  it.each([
    '/api/session',
    '/api/boards',
    '/api/boards/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
    '/api/general',
  ])('GET %s sin cookie devuelve 401', async (path) => {
    const res = await request(createApp()).get(path)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'La app está bloqueada' },
    })
  })

  it('una ruta que no existe también da 401 sin cookie', async () => {
    const res = await request(createApp()).get('/api/no-existe')
    expect(res.status).toBe(401)
  })

  it('con la cookie, /api/session devuelve 200', async () => {
    const app = createApp()
    const cookie = await unlockedCookie(app)
    const res = await request(app).get('/api/session').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ unlocked: true })
  })

  it('una cookie sin firma o con la firma cambiada no pasa', async () => {
    const app = createApp()
    const cookie = await unlockedCookie(app)
    const tampered = `${cookie.slice(0, -3)}abc`
    for (const value of [`${SESSION_COOKIE}=unlocked`, tampered]) {
      const res = await request(app).get('/api/session').set('Cookie', value)
      expect(res.status).toBe(401)
    }
  })

  it('POST /api/lock borra la cookie', async () => {
    const app = createApp()
    const cookie = await unlockedCookie(app)
    const res = await request(app).post('/api/lock').set('Cookie', cookie)
    expect(res.status).toBe(204)
    const cleared = res.get('Set-Cookie')?.[0] ?? ''
    expect(cleared).toMatch(new RegExp(`^${SESSION_COOKIE}=;`))
    expect(cleared).toContain('Expires=Thu, 01 Jan 1970')
  })
})

describe('validación', () => {
  it('un id que no es uuid devuelve 400', async () => {
    const app = createApp()
    const cookie = await unlockedCookie(app)
    const res = await request(app).get('/api/boards/123').set('Cookie', cookie)
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })

  it('con cookie, una ruta que no existe devuelve 404', async () => {
    const app = createApp()
    const cookie = await unlockedCookie(app)
    const res = await request(app).get('/api/no-existe').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })
})
