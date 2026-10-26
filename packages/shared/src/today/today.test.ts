import { describe, expect, it } from 'vitest'
import { addDays, groupToday, pendingTodayCount } from './today'

describe('addDays', () => {
  it.each([
    ['2026-10-05', 0, '2026-10-05'],
    ['2026-10-05', 1, '2026-10-06'],
    ['2026-10-05', -1, '2026-10-04'],
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2026-10-05', 6, '2026-10-11'],
  ])('%s + %i es %s', (day, days, expected) => {
    expect(addDays(day, days)).toBe(expected)
  })
})

type Row = { id: string; day: string | null; completedAt: string | null; createdAt: string }

const row = (id: string, day: string | null, rest: Partial<Row> = {}): Row => ({
  id,
  day,
  completedAt: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  ...rest,
})

const ids = (rows: Row[]) => rows.map((r) => r.id)

describe('groupToday', () => {
  const today = '2026-10-05'

  it('lo pendiente de días anteriores va en hoy, antes que lo de hoy', () => {
    const { today: list } = groupToday(
      [
        row('hoy', today),
        row('ayer', '2026-10-04'),
        row('sabado', '2026-10-03'),
        row('hoy-temprano', today, { createdAt: '2026-10-01T08:00:00.000Z' }),
      ],
      today,
    )
    expect(ids(list)).toEqual(['sabado', 'ayer', 'hoy-temprano', 'hoy'])
  })

  it('lo tachado va aparte y lo que no tiene día no está', () => {
    const { today: list, done } = groupToday(
      [
        row('a', today),
        row('tachada', today, { completedAt: '2026-10-05T15:00:00.000Z' }),
        row('sin-dia', null),
        row('sin-dia-tachada', null, { completedAt: '2026-10-05T15:00:00.000Z' }),
      ],
      today,
    )
    expect(ids(list)).toEqual(['a'])
    expect(ids(done)).toEqual(['tachada'])
  })

  it('lo que viene va por día, sin días vacíos', () => {
    const { today: list, upcoming } = groupToday(
      [
        row('jueves', '2026-10-08'),
        row('manana-2', '2026-10-06', { createdAt: '2026-10-02T00:00:00.000Z' }),
        row('manana-1', '2026-10-06'),
        row('manana-tachada', '2026-10-06', { completedAt: '2026-10-05T09:00:00.000Z' }),
      ],
      today,
    )
    expect(list).toEqual([])
    expect(upcoming.map((group) => [group.day, ids(group.tasks)])).toEqual([
      ['2026-10-06', ['manana-1', 'manana-2']],
      ['2026-10-08', ['jueves']],
    ])
  })

  it('el mismo momento se desempata por id', () => {
    const { today: list } = groupToday([row('b', today), row('a', today)], today)
    expect(ids(list)).toEqual(['a', 'b'])
  })
})

describe('pendingTodayCount', () => {
  it('cuenta lo pendiente de hoy y de antes, no lo tachado, lo que viene ni lo que no tiene día', () => {
    expect(
      pendingTodayCount(
        [
          row('hoy', '2026-10-05'),
          row('ayer', '2026-10-04'),
          row('tachada', '2026-10-05', { completedAt: '2026-10-05T10:00:00.000Z' }),
          row('manana', '2026-10-06'),
          row('sin-dia', null),
        ],
        '2026-10-05',
      ),
    ).toBe(2)
  })
})
