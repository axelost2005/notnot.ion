import { LIMITS } from '@notnot/shared'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { unlock } from '../testing'

// Solo candado y validaciones de la sección Notas: todas cortan antes de tocar la base.
const app = createApp()
let cookie: string

beforeAll(async () => {
  cookie = await unlock(app)
})

const ID = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'

type Case = [method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: object]

describe('candado', () => {
  it.each<Case>([
    ['get', '/api/folders'],
    ['post', '/api/folders', { name: 'Clientes' }],
    ['patch', `/api/folders/${ID}`, { name: 'Clientes' }],
    ['delete', `/api/folders/${ID}`],
    ['get', `/api/pages/${ID}`],
    ['post', '/api/pages', {}],
    ['patch', `/api/pages/${ID}`, { content: 'hola' }],
    ['delete', `/api/pages/${ID}`],
  ])('%s %s sin cookie devuelve 401', async (method, path, body) => {
    const res = await request(app)[method](path).send(body)
    expect(res.status).toBe(401)
  })
})

describe('validaciones', () => {
  it.each<Case>([
    ['post', '/api/folders', { name: '' }],
    ['post', '/api/folders', { name: '   ' }],
    ['post', '/api/folders', { name: 'x'.repeat(LIMITS.folderName + 1) }],
    ['post', '/api/folders', { name: 'Clientes', parentId: 'raiz' }],
    ['patch', `/api/folders/${ID}`, {}],
    ['patch', '/api/folders/123', { name: 'Clientes' }],
    ['post', '/api/pages', { title: 'x'.repeat(LIMITS.pageTitle + 1) }],
    ['post', '/api/pages', { folderId: 'raiz' }],
    ['patch', `/api/pages/${ID}`, {}],
    ['patch', `/api/pages/${ID}`, { content: 'x'.repeat(LIMITS.pageContent + 1) }],
    ['get', '/api/pages/123'],
  ])('%s %s con datos inválidos devuelve 400', async (method, path, body) => {
    const res = await request(app)[method](path).set('Cookie', cookie).send(body)
    expect(res.status).toBe(400)
  })

  it('el texto de una nota larga entra (tiene su propio límite de JSON)', async () => {
    // Pasa el límite general de 100 kb y llega a la validación de la nota (que sí lo corta).
    const long = 'ñ'.repeat(LIMITS.pageContent + 1)
    const res = await request(app).patch(`/api/pages/${ID}`).set('Cookie', cookie).send({
      content: long,
    })
    expect(res.status).toBe(400)
    expect(JSON.stringify(res.body)).toContain('Máximo 50000 caracteres')
  })
})
