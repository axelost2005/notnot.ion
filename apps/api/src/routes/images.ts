import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { IMAGE_TYPES, idParamsSchema, imageUploadQuerySchema, LIMITS } from '@notnot/shared'
import express, { Router } from 'express'
import { badRequest } from '../middleware/errors'
import { addTaskImage, deleteImage, openImage } from '../services/images'

export const imagesRouter = Router()

// La imagen viaja sola en el cuerpo, con su propio límite (el JSON de la API tiene 100 kb).
const imageBody = express.raw({ type: [...IMAGE_TYPES], limit: LIMITS.imageBytes })

imagesRouter.post('/tasks/:id/images', imageBody, async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const { width, height } = imageUploadQuerySchema.parse(req.query)
  const body: unknown = req.body
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw badRequest('Mandá una imagen WebP, JPEG o PNG')
  }
  res.status(201).json(await addTaskImage(id, { body, width, height }))
})

imagesRouter.get('/images/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const image = await openImage(id)
  res.set({
    // No cambian una vez subidas: las guarda el navegador (y nadie más, son privadas).
    'Cache-Control': 'private, max-age=31536000, immutable',
    'Content-Type': image.contentType,
    'Content-Length': String(image.size),
    'X-Content-Type-Options': 'nosniff',
  })
  await pipeline(Readable.fromWeb(image.stream), res)
})

imagesRouter.delete('/images/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deleteImage(id)
  res.status(204).end()
})
