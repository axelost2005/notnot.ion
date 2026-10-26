import cookieParser from 'cookie-parser'
import express from 'express'
import { env } from './env'
import { errorHandler, notFoundHandler } from './middleware/errors'
import { requireSession } from './middleware/session'
import { boardsRouter } from './routes/boards'
import { columnsRouter } from './routes/columns'
import { foldersRouter } from './routes/folders'
import { healthRouter } from './routes/health'
import { historyRouter } from './routes/history'
import { imagesRouter } from './routes/images'
import { notesRouter } from './routes/notes'
import { pagesRouter } from './routes/pages'
import { paymentsRouter } from './routes/payments'
import { receivablesRouter } from './routes/receivables'
import { createUnlockRouter, sessionRouter } from './routes/session'
import { tasksRouter } from './routes/tasks'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // En Vercel hay un solo proxy delante: req.ip sale de X-Forwarded-For.
  app.set('trust proxy', 1)
  // El texto de una nota de la sección Notas puede ser largo: esa ruta tiene su propio límite.
  app.use('/api/pages', express.json({ limit: '512kb' }))
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
  api.use(columnsRouter)
  api.use(tasksRouter)
  api.use(notesRouter)
  api.use(historyRouter)
  api.use(imagesRouter)
  api.use(foldersRouter)
  api.use(pagesRouter)
  api.use(paymentsRouter)
  api.use(receivablesRouter)
  api.use(notFoundHandler)

  app.use('/api', api)
  app.use(errorHandler)
  return app
}
