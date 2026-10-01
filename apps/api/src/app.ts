import express from 'express'
import { errorHandler, notFoundHandler } from './middleware/errors'
import { healthRouter } from './routes/health'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // En Vercel hay un solo proxy delante: req.ip sale de X-Forwarded-For.
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '100kb' }))

  const api = express.Router()
  api.use(healthRouter)
  api.use(notFoundHandler)

  app.use('/api', api)
  app.use(errorHandler)
  return app
}
