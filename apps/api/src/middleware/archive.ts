import { DAY_START_HEADER } from '@notnot/shared'
import type { RequestHandler } from 'express'
import { archiveDoneTasks } from '../services/history'

const MAX_SKEW_MS = 48 * 60 * 60 * 1000

/** La medianoche del dispositivo, si es creíble: a menos de 48 h de la hora del server. */
export function parseDayStart(value: string | undefined, now = new Date()): Date | null {
  if (!value) return null
  const dayStart = new Date(value)
  if (Number.isNaN(dayStart.getTime())) return null
  return Math.abs(dayStart.getTime() - now.getTime()) <= MAX_SKEW_MS ? dayStart : null
}

/**
 * Antes de leer tarjetas, lo terminado antes de hoy pasa al historial. Así cada día arranca
 * con "Hecho" vacío sin ninguna tarea programada. Sin el header no hace nada.
 */
export const archiveBeforeToday: RequestHandler = async (req, _res, next) => {
  const dayStart = parseDayStart(req.get(DAY_START_HEADER))
  if (dayStart) await archiveDoneTasks(dayStart)
  next()
}
