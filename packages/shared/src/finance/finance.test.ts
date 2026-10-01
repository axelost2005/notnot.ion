import { describe, expect, it } from 'vitest'
import { groupByCategory, monthOf, parseAmount, shiftMonth, totalsByCurrency } from './finance'

describe('parseAmount', () => {
  it.each([
    ['150000', 15_000_000],
    ['150.000', 15_000_000],
    ['1.234.567', 123_456_700],
    ['1.234,5', 123_450],
    ['1.234,56', 123_456],
    ['99,9', 9_990],
    ['15.50', 1_550],
    ['12.5', 1_250],
    ['0,01', 1],
    [' $ 2.500 ', 250_000],
    ['US$ 1.200', 120_000],
  ])('"%s" son %i centavos', (text, cents) => {
    expect(parseAmount(text)).toBe(cents)
  })

  it.each(['', 'abc', '1,2,3', '1,234', '12,345', '-5', '1.23,4', '5e3'])(
    '"%s" no es un monto',
    (text) => {
      // "1,234" y "12,345" no: con coma, a lo sumo dos decimales.
      expect(parseAmount(text)).toBeNull()
    },
  )
})

describe('meses', () => {
  it('el mes de una fecha', () => {
    expect(monthOf('2026-10-15')).toBe('2026-10')
  })

  it('pasa de año para los dos lados', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
    expect(shiftMonth('2026-10', -12)).toBe('2025-10')
    expect(shiftMonth('2026-10', 0)).toBe('2026-10')
  })
})

const payment = (amountCents: number, currency: 'ARS' | 'USD', category: string | null) => ({
  amountCents,
  currency,
  category,
})

describe('totales', () => {
  it('suma por moneda, ARS primero, y solo las que tienen pagos', () => {
    expect(
      totalsByCurrency([
        payment(100, 'USD', null),
        payment(500, 'ARS', null),
        payment(50, 'USD', null),
      ]),
    ).toEqual([
      { currency: 'ARS', totalCents: 500, count: 1 },
      { currency: 'USD', totalCents: 150, count: 2 },
    ])
    expect(totalsByCurrency([])).toEqual([])
  })

  it('agrupa por categoría, en orden alfabético y sin categoría al final', () => {
    const groups = groupByCategory([
      payment(100, 'ARS', 'Mantenimiento'),
      payment(200, 'ARS', null),
      payment(300, 'USD', 'diseño'),
      payment(400, 'ARS', 'Mantenimiento'),
    ])
    expect(groups.map((group) => group.category)).toEqual(['diseño', 'Mantenimiento', null])
    expect(groups[1]!.totals).toEqual([{ currency: 'ARS', totalCents: 500, count: 2 }])
    expect(groups[2]!.payments).toHaveLength(1)
  })
})
