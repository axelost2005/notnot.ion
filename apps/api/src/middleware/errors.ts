import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client'

export class HttpError extends Error {
  readonly status: 400 | 401 | 404 | 409 | 413
  readonly code: string

  constructor(status: HttpError['status'], code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const badRequest = (message: string) => new HttpError(400, 'BAD_REQUEST', message)
export const notFound = (message = 'No encontrado') => new HttpError(404, 'NOT_FOUND', message)
export const conflict = (message: string) => new HttpError(409, 'CONFLICT', message)

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound('Ruta no encontrada'))
}

function hasType(err: unknown): err is { type: string } {
  return typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string'
}

function toHttpError(err: unknown): HttpError | null {
  if (err instanceof HttpError) return err
  if (err instanceof z.ZodError) {
    const issue = err.issues[0]
    const path = issue?.path.join('.')
    return badRequest(issue ? `${path ? `${path}: ` : ''}${issue.message}` : 'Datos inválidos')
  }
  // Errores de express.json() y express.raw(): cuerpo mal formado o demasiado grande.
  if (hasType(err) && err.type === 'entity.too.large')
    return new HttpError(413, 'TOO_LARGE', 'Es demasiado grande para mandarlo')
  if (hasType(err) && err.type.startsWith('entity.'))
    return badRequest('El cuerpo del pedido no es válido')
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return notFound()
    if (err.code === 'P2002' || err.code === 'P2003') return conflict('Choca con datos existentes')
  }
  return null
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, next) => {
  // Si ya se estaba mandando algo (una imagen), solo queda cortar la respuesta.
  if (res.headersSent) return next(err)
  const httpError = toHttpError(err)
  if (httpError) {
    res
      .status(httpError.status)
      .json({ error: { code: httpError.code, message: httpError.message } })
    return
  }
  console.error(err)
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor' } })
}
