import { addDays, daysBetween } from '@notnot/shared'

const utc = (day: string) => new Date(`${day}T00:00:00.000Z`)
const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'UTC' })
const weekdayShort = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' })
const dayMonth = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const fullDay = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "lunes 5 de octubre". */
export const longDay = (day: string) => fullDay.format(utc(day)).replace(',', '')

/** "Mañana · martes 6", "Jueves 8" y, desde la semana que viene, "Jueves 15 de octubre". */
export function dayHeading(day: string, today: string) {
  const days = daysBetween(today, day)
  const date = utc(day)
  const name = `${weekday.format(date)} ${date.getUTCDate()}`
  if (days === 1) return `Mañana · ${name}`
  return capitalize(days < 7 ? name : longDay(day))
}

/** De qué día viene algo pendiente: "de ayer", "del sábado", "del 28 de septiembre". */
export function carriedFrom(day: string, today: string) {
  const days = daysBetween(day, today)
  if (days === 1) return 'de ayer'
  return `del ${days < 7 ? weekday.format(utc(day)) : dayMonth.format(utc(day))}`
}

export type DayOption = {
  day: string
  /** Para el chip: "Hoy", "Mañana", "mié 7". */
  label: string
  /** Para lectores de pantalla y el menú: "miércoles 7". */
  name: string
}

/** Hoy, mañana y los cinco días que siguen: a dónde se puede anotar o mover algo. */
export function dayOptions(today: string): DayOption[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index)
    const date = utc(day)
    const name = `${weekday.format(date)} ${date.getUTCDate()}`
    if (index === 0) return { day, label: 'Hoy', name: 'hoy' }
    if (index === 1) return { day, label: 'Mañana', name: 'mañana' }
    return {
      day,
      label: `${weekdayShort.format(date).replace('.', '')} ${date.getUTCDate()}`,
      name,
    }
  })
}
