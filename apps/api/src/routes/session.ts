import { unlockSchema } from '@notnot/shared'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { HttpError } from '../middleware/errors'
import { clearSessionCookie, isValidCode, setSessionCookie } from '../middleware/session'

/** `/unlock` es pública. Se arma por app para que cada instancia tenga su propio contador. */
export function createUnlockRouter() {
  const router = Router()

  // En serverless el contador vive en cada instancia: es aproximado. Lo que protege es el código largo.
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Demasiados intentos. Probá de nuevo en 15 minutos.',
        },
      })
    },
  })

  router.post('/unlock', limiter, (req, res) => {
    const { code } = unlockSchema.parse(req.body)
    if (!isValidCode(code)) throw new HttpError(401, 'INVALID_CODE', 'El código no es correcto')
    setSessionCookie(res)
    res.status(204).end()
  })

  return router
}

/** Rutas de sesión que ya pasaron por el candado. */
export const sessionRouter = Router()

sessionRouter.get('/session', (_req, res) => {
  res.json({ unlocked: true })
})

sessionRouter.post('/lock', (_req, res) => {
  clearSessionCookie(res)
  res.status(204).end()
})
