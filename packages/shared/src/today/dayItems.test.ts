import { describe, expect, it } from 'vitest'
import { LIMITS } from '../constants'
import { addDays, groupDayItems, pendingTodayCount, splitDayItems } from './dayItems'

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

describe('splitDayItems', () => {
  it('una línea es una cosa', () => {
    expect(splitDayItems('llevar a la perra al veterinario')).toEqual([
      'llevar a la perra al veterinario',
    ])
  })

  it('cada línea es una cosa y las vacías no cuentan', () => {
    expect(splitDayItems('comprar alimento\n\n  \nhablarle a Pepito\r\npagar la luz')).toEqual([
      'comprar alimento',
      'hablarle a Pepito',
      'pagar la luz',
    ])
  })

  it('saca las viñetas y los corchetes del principio', () => {
    expect(
      splitDayItems(
        ['- uno', '* dos', '• tres', '[] cuatro', '[ ] cinco', '[x] seis', '- [ ] siete'].join(
          '\n',
        ),
      ),
    ).toEqual(['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete'])
  })

  it('no toca lo que solo se parece a una viñeta', () => {
    expect(splitDayItems('-5 grados\n*importante*\n2 kg de alimento')).toEqual([
      '-5 grados',
      '*importante*',
      '2 kg de alimento',
    ])
  })

  it('junta los espacios de más', () => {
    expect(splitDayItems('  llamar   al   dentista  ')).toEqual(['llamar al dentista'])
  })

  it('una viñeta sola no es nada', () => {
    expect(splitDayItems('-\n[ ]\n•')).toEqual([])
  })

  it(`corta los textos en ${LIMITS.dayItemText} caracteres`, () => {
    const [text] = splitDayItems('a'.repeat(LIMITS.dayItemText + 50))
    expect(text).toHaveLength(LIMITS.dayItemText)
  })
})

type Row = { id: string; day: string; doneAt: string | null; createdAt: string }

const row = (id: string, day: string, rest: Partial<Row> = {}): Row => ({
  id,
  day,
  doneAt: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  ...rest,
})

const ids = (rows: Row[]) => rows.map((r) => r.id)

describe('groupDayItems', () => {
  const today = '2026-10-05'

  it('lo pendiente de días anteriores va en hoy, antes que lo de hoy', () => {
    const { today: list } = groupDayItems(
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

  it('lo tachado queda en su lugar', () => {
    const { today: list } = groupDayItems(
      [
        row('a', today, { createdAt: '2026-10-05T10:00:00.000Z' }),
        row('b', today, {
          createdAt: '2026-10-05T11:00:00.000Z',
          doneAt: '2026-10-05T15:00:00.000Z',
        }),
        row('c', today, { createdAt: '2026-10-05T12:00:00.000Z' }),
      ],
      today,
    )
    expect(ids(list)).toEqual(['a', 'b', 'c'])
  })

  it('lo que viene va por día, sin días vacíos', () => {
    const { today: list, upcoming } = groupDayItems(
      [
        row('jueves', '2026-10-08'),
        row('manana-2', '2026-10-06', { createdAt: '2026-10-02T00:00:00.000Z' }),
        row('manana-1', '2026-10-06'),
      ],
      today,
    )
    expect(list).toEqual([])
    expect(upcoming.map((group) => [group.day, ids(group.items)])).toEqual([
      ['2026-10-06', ['manana-1', 'manana-2']],
      ['2026-10-08', ['jueves']],
    ])
  })

  it('el mismo momento se desempata por id', () => {
    const { today: list } = groupDayItems([row('b', today), row('a', today)], today)
    expect(ids(list)).toEqual(['a', 'b'])
  })
})

describe('pendingTodayCount', () => {
  it('cuenta lo pendiente de hoy y de antes, no lo tachado ni lo que viene', () => {
    expect(
      pendingTodayCount(
        [
          row('hoy', '2026-10-05'),
          row('ayer', '2026-10-04'),
          row('tachada', '2026-10-05', { doneAt: '2026-10-05T10:00:00.000Z' }),
          row('manana', '2026-10-06'),
        ],
        '2026-10-05',
      ),
    ).toBe(2)
  })
})
