import { describe, expect, it } from 'vitest'
import { daysBetween, dueCount, groupReceivables, remainingCents, settledOn } from './receivables'

describe('remainingCents', () => {
  it.each([
    [30_000_000, 0, 30_000_000],
    [30_000_000, 15_000_000, 15_000_000],
    [30_000_000, 30_000_000, 0],
    // Pagaron de más: no queda nada (no hay saldo a favor).
    [30_000_000, 31_000_000, 0],
  ])('de %i con %i pagado faltan %i', (amountCents, paidCents, remaining) => {
    expect(remainingCents({ amountCents, paidCents })).toBe(remaining)
  })
})

describe('daysBetween', () => {
  it.each([
    ['2026-10-01', '2026-10-01', 0],
    ['2026-10-01', '2026-10-04', 3],
    ['2026-10-04', '2026-10-01', -3],
    ['2026-09-29', '2026-10-02', 3],
    ['2026-12-31', '2027-01-01', 1],
    ['2028-02-28', '2028-03-01', 2],
  ])('de %s a %s: %i', (from, to, days) => {
    expect(daysBetween(from, to)).toBe(days)
  })
})

type Row = {
  id: string
  amountCents: number
  paidCents: number
  dueDate: string | null
  createdAt: string
  payments: { date: string }[]
}

const row = (id: string, rest: Partial<Row> = {}): Row => ({
  id,
  amountCents: 100,
  paidCents: 0,
  dueDate: null,
  createdAt: '2026-09-01T12:00:00.000Z',
  payments: [],
  ...rest,
})

const ids = (rows: Row[]) => rows.map((r) => r.id)

describe('groupReceivables', () => {
  const today = '2026-10-15'
  const groups = groupReceivables(
    [
      row('sin-fecha-vieja', { createdAt: '2026-09-01T10:00:00.000Z' }),
      row('vence-noviembre', { dueDate: '2026-11-01' }),
      row('vencio-ayer', { dueDate: '2026-10-14' }),
      row('cobrada-octubre', {
        dueDate: '2026-10-01',
        paidCents: 100,
        payments: [{ date: '2026-10-02' }],
      }),
      row('vence-hoy', { dueDate: today }),
      row('vencio-septiembre', { dueDate: '2026-09-20', paidCents: 40 }),
      row('sin-fecha-nueva', { createdAt: '2026-10-10T10:00:00.000Z' }),
      row('cobrada-en-dos', {
        paidCents: 120,
        payments: [{ date: '2026-10-12' }, { date: '2026-09-30' }],
      }),
    ],
    today,
  )

  it('las vencidas primero, desde la más vieja (aunque hayan pagado una parte)', () => {
    expect(ids(groups.overdue)).toEqual(['vencio-septiembre', 'vencio-ayer'])
  })

  it('las que vencen, por fecha: hoy cuenta como por vencer', () => {
    expect(ids(groups.upcoming)).toEqual(['vence-hoy', 'vence-noviembre'])
  })

  it('las sin fecha, la última anotada primero', () => {
    expect(ids(groups.undated)).toEqual(['sin-fecha-nueva', 'sin-fecha-vieja'])
  })

  it('las cobradas (también si pagaron de más), la última cobrada primero', () => {
    expect(ids(groups.settled)).toEqual(['cobrada-en-dos', 'cobrada-octubre'])
  })

  it('dos con la misma fecha: primero la que se anotó antes', () => {
    const { upcoming } = groupReceivables(
      [
        row('segunda', { dueDate: '2026-11-01', createdAt: '2026-10-02T00:00:00.000Z' }),
        row('primera', { dueDate: '2026-11-01', createdAt: '2026-10-01T00:00:00.000Z' }),
      ],
      today,
    )
    expect(ids(upcoming)).toEqual(['primera', 'segunda'])
  })
})

describe('settledOn', () => {
  it('es el día del último pago', () => {
    expect(settledOn({ payments: [{ date: '2026-10-12' }, { date: '2026-09-30' }] })).toBe(
      '2026-10-12',
    )
    expect(settledOn({ payments: [] })).toBeNull()
  })
})

describe('dueCount', () => {
  it('cuenta las pendientes que vencen hoy o ya vencieron', () => {
    const rows = [
      row('a', { dueDate: '2026-10-15' }),
      row('b', { dueDate: '2026-10-01' }),
      row('c', { dueDate: '2026-10-16' }),
      row('d', { dueDate: null }),
      row('e', { dueDate: '2026-10-01', paidCents: 100 }),
    ]
    expect(dueCount(rows, '2026-10-15')).toBe(2)
  })
})
