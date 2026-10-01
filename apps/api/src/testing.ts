import type { Express } from 'express'
import request from 'supertest'

/** APP_SECRET de los tests (ver vitest.config.ts). */
export const TEST_CODE = 'caballo bateria grapa correcta'

/** Desbloquea la app y devuelve la cookie lista para mandar en `Cookie`. */
export async function unlock(app: Express): Promise<string> {
  const res = await request(app).post('/api/unlock').send({ code: TEST_CODE })
  const cookie = res.get('Set-Cookie')?.[0]
  if (!cookie) throw new Error('No vino la cookie de sesión')
  return cookie.split(';')[0]!
}
