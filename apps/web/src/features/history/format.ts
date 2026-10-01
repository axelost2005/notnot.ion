const dayFormat = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const dayFormatWithYear = new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' })

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** Para agrupar por día en el horario del dispositivo. */
export const dayKey = (iso: string) => new Date(iso).toDateString()

/** "Ayer", "Lunes, 28 de septiembre" y, de otro año, con el año. */
export function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, now)) return 'Hoy'
  if (sameDay(date, yesterday)) return 'Ayer'
  const format = date.getFullYear() === now.getFullYear() ? dayFormat : dayFormatWithYear
  const label = format.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}
