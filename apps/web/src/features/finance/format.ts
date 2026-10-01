import type { Currency } from '@notnot/shared'

const pad = (value: number) => String(value).padStart(2, '0')

/** Hoy en este dispositivo ("2026-10-15"). */
export function today() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const currentMonth = () => today().slice(0, 7)

/** "$ 250.000", "US$ 1.234,50": los centavos solo si hay. */
export function formatMoney(cents: number, currency: Currency) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

/** Para editar el monto: "250.000" o "1.234,50". */
export function formatAmount(cents: number) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

const utc = (day: string) => new Date(`${day}T00:00:00.000Z`)
const monthFormat = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const weekdayFormat = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' })
const shortMonthFormat = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' })

/** "Octubre de 2026". */
export function monthLabel(month: string) {
  const label = monthFormat.format(utc(`${month}-01`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** "octubre" (para frases como "No hay pagos en octubre"). */
export const monthName = (month: string) =>
  new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'UTC' }).format(utc(`${month}-01`))

/** El día de un pago: número, día de la semana y mes ("15", "jue", "oct"). */
export function dayParts(day: string) {
  const date = utc(day)
  return {
    day: String(date.getUTCDate()),
    weekday: weekdayFormat.format(date).replace('.', ''),
    month: shortMonthFormat.format(date).replace('.', ''),
  }
}
