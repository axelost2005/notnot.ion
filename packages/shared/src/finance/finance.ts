import { compareNames } from '../pages/tree'

export const CURRENCIES = ['ARS', 'USD'] as const

export type Currency = (typeof CURRENCIES)[number]

/**
 * Un monto escrito como en Argentina ("150.000", "1.234,50") o con punto decimal ("15.50"),
 * en centavos. Un punto seguido de exactamente 3 dígitos separa miles. `null` si no es un monto.
 */
export function parseAmount(text: string): number | null {
  const value = text.replace(/\s|\$|US/gi, '')
  const thousands = /^\d{1,3}(\.\d{3})+$/
  let whole: string
  let decimals = ''
  const withComma = /^([\d.]+),(\d{1,2})$/.exec(value)
  if (withComma) {
    // La coma es la de los decimales: los puntos, si hay, separan miles.
    whole = withComma[1]!
    decimals = withComma[2]!
    if (!/^\d+$/.test(whole) && !thousands.test(whole)) return null
  } else if (/^\d+\.\d{1,2}$/.test(value)) {
    // Un solo punto con uno o dos dígitos después: es el decimal ("15.50").
    ;[whole = '', decimals = ''] = value.split('.')
  } else if (/^\d+$/.test(value) || thousands.test(value)) {
    whole = value
  } else {
    return null
  }
  const cents = Number(whole.replace(/\./g, '')) * 100 + Number(decimals.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

/** "2026-10" para una fecha "2026-10-15". */
export const monthOf = (date: string) => date.slice(0, 7)

/** El mes de al lado: `shiftMonth('2026-12', 1)` es "2027-01". */
export function shiftMonth(month: string, delta: number): string {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number)
  const index = year * 12 + (monthNumber - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

type Amount = { amountCents: number; currency: Currency }

/** Cuánto entró por moneda (en el orden de `CURRENCIES`), solo las que tienen algo. */
export function totalsByCurrency(payments: readonly Amount[]) {
  return CURRENCIES.map((currency) => {
    const inCurrency = payments.filter((payment) => payment.currency === currency)
    return {
      currency,
      totalCents: inCurrency.reduce((sum, payment) => sum + payment.amountCents, 0),
      count: inCurrency.length,
    }
  }).filter((total) => total.count > 0)
}

/** Agrupados por categoría (alfabético; los que no tienen, al final), con sus totales. */
export function groupByCategory<T extends Amount & { category: string | null }>(
  payments: readonly T[],
) {
  const groups = new Map<string | null, T[]>()
  for (const payment of payments) {
    groups.set(payment.category, [...(groups.get(payment.category) ?? []), payment])
  }
  return [...groups.entries()]
    .sort(([a], [b]) =>
      a === null || b === null ? Number(a === null) - Number(b === null) : compareNames(a, b),
    )
    .map(([category, items]) => ({ category, payments: items, totals: totalsByCurrency(items) }))
}
