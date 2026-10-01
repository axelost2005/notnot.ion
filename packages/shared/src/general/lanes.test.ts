import { describe, expect, it } from 'vitest'
import { columnForLane, laneOf } from './lanes'

// Desordenadas a propósito: lo que manda es `position`.
const columns = [
  { id: 'hecho', position: 'a3', isDone: true },
  { id: 'revision', position: 'a2', isDone: false },
  { id: 'por-hacer', position: 'a0', isDone: false },
  { id: 'en-curso', position: 'a1', isDone: false },
]
const byId = (id: string) => columns.find((c) => c.id === id)!

describe('laneOf', () => {
  it.each([
    ['por-hacer', 'todo'],
    ['en-curso', 'doing'],
    ['revision', 'doing'],
    ['hecho', 'done'],
  ])('%s va a %s', (id, lane) => {
    expect(laneOf(byId(id), columns)).toBe(lane)
  })

  it('la de terminadas va a "Hecho" aunque esté primera', () => {
    const doneFirst = [
      { id: 'hecho', position: 'a0', isDone: true },
      { id: 'por-hacer', position: 'a1', isDone: false },
    ]
    expect(laneOf(doneFirst[0]!, doneFirst)).toBe('done')
    expect(laneOf(doneFirst[1]!, doneFirst)).toBe('todo')
  })
})

describe('columnForLane', () => {
  it.each([
    ['todo', 'por-hacer'],
    ['doing', 'en-curso'],
    ['done', 'hecho'],
  ] as const)('%s va a %s', (lane, id) => {
    expect(columnForLane(columns, lane)?.id).toBe(id)
  })

  it('sin una segunda columna normal, "En curso" no tiene dónde ir', () => {
    const twoColumns = [
      { id: 'por-hacer', position: 'a0', isDone: false },
      { id: 'hecho', position: 'a1', isDone: true },
    ]
    expect(columnForLane(twoColumns, 'doing')).toBeUndefined()
    expect(columnForLane(twoColumns, 'todo')?.id).toBe('por-hacer')
  })
})
