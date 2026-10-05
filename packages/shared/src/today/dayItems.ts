// Hoy: cosas para hacer por día, aparte de los tableros. Lo pendiente de un día que ya pasó se ve
// en el de hoy.

import { LIMITS } from '../constants'

type Dated = {
  id: string
  /** El día para el que se anotó ("2026-10-05"). */
  day: string
  doneAt: string | null
  createdAt: string
}

/** "2026-10-05" + 1 = "2026-10-06". */
export function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// Viñeta ("- ", "* ", "• ") y/o casilla ("[]", "[ ]", "[x]") al principio de una línea pegada.
const BULLET = /^\s*(?:[-*•](?:\s+|$))?(?:\[[ xX]?\](?:\s+|$))?/

/** Lo escrito o pegado, una cosa por línea: sin viñetas, sin espacios de más y sin las vacías. */
export function splitDayItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line.replace(BULLET, '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.dayItemText).trim(),
    )
    .filter((line) => line !== '')
}

/** Por día y, dentro del día, en el orden en que se anotó. */
const byDayAndCreation = (a: Dated, b: Dated) =>
  a.day.localeCompare(b.day) ||
  a.createdAt.localeCompare(b.createdAt) ||
  a.id.localeCompare(b.id)

/**
 * Lo de hoy (con lo pendiente de días anteriores primero) y cada día que viene con algo. Lo
 * tachado queda en su lugar. `today` es el día del dispositivo.
 */
export function groupDayItems<T extends Dated>(items: readonly T[], today: string) {
  const sorted = [...items].sort(byDayAndCreation)
  const upcoming: { day: string; items: T[] }[] = []
  for (const item of sorted) {
    if (item.day <= today) continue
    const last = upcoming.at(-1)
    if (last?.day === item.day) last.items.push(item)
    else upcoming.push({ day: item.day, items: [item] })
  }
  return { today: sorted.filter((item) => item.day <= today), upcoming }
}

/** Cuántas quedan para hoy (el número de la sidebar y de la barra de abajo). */
export const pendingTodayCount = (
  items: readonly Pick<Dated, 'day' | 'doneAt'>[],
  today: string,
) => items.filter((item) => item.doneAt === null && item.day <= today).length
