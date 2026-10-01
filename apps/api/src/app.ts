import cookieParser from 'cookie-parser'
import express from 'express'
import { env } from './env'
import { errorHandler, notFoundHandler } from './middleware/errors'
import { requireSession } from './middleware/session'
import { boardsRouter } from './routes/boards'
import { healthRouter } from './routes/health'
import { createUnlockRouter, sessionRouter } from './routes/session'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // En Vercel hay un solo proxy delante: req.ip sale de X-Forwarded-For.
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser(env.SESSION_SECRET))

  const api = express.Router()
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  api.use(healthRouter)
  api.use(createUnlockRouter())
  // Candado: todo lo que sigue necesita la cookie, incluso las rutas que no existen.
  api.use(requireSession)
  api.use(sessionRouter)
  api.use(boardsRouter)
  api.use(notFoundHandler)

  app.use('/api', api)
  app.use(errorHandler)
  return app
}
