import { createHash, timingSafeEqual } from 'node:crypto'
import { normalizeForMatch } from '@notnot/shared'
import type { CookieOptions, RequestHandler, Response } from 'express'
import { env } from '../env'
import { HttpError } from './errors'

export const SESSION_COOKIE = 'notnot_session'
const SESSION_VALUE = 'unlocked'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
}

// Perdona mayúsculas, acentos y espacios de más: en el celu el teclado los mete solo.
const hashCode = (value: string) =>
  createHash('sha256')
    .update(normalizeForMatch(value.trim().replace(/\s+/g, ' ')))
    .digest()

const expectedHash = hashCode(env.APP_SECRET)

export function isValidCode(code: string): boolean {
  return timingSafeEqual(hashCode(code), expectedHash)
}

export function setSessionCookie(res: Response) {
  res.cookie(SESSION_COOKIE, SESSION_VALUE, { ...cookieOptions, signed: true, maxAge: ONE_YEAR_MS })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions)
}

/** Candado: sin cookie firmada válida, 401. */
export const requireSession: RequestHandler = (req, _res, next) => {
  const cookies: unknown = req.signedCookies
  const unlocked =
    typeof cookies === 'object' &&
    cookies !== null &&
    SESSION_COOKIE in cookies &&
    cookies[SESSION_COOKIE] === SESSION_VALUE
  if (unlocked) return next()
  next(new HttpError(401, 'UNAUTHORIZED', 'La app está bloqueada'))
}
