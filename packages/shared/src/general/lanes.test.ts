import { describe, expect, it } from 'vitest'
import { boardStatus, columnForLane, laneOf } from './lanes'

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

describe('boardStatus', () => {
  // Desordenadas a propósito: la primera es por posición.
  const cols = [
    { id: 'hecho', position: 'a2', isDone: true },
    { id: 'curso', position: 'a1', isDone: false },
    { id: 'hacer', position: 'a0', isDone: false },
  ]
  const task = (columnId: string, completedAt: string | null = null) => ({ columnId, completedAt })

  it('sin tareas está al día', () => expect(boardStatus(cols, [])).toBe('done'))
  it('todo tachado está al día', () =>
    expect(boardStatus(cols, [task('hecho', '2026-10-26T10:00:00.000Z')])).toBe('done'))
  it('abiertas solo en la primera columna: por hacer', () =>
    expect(boardStatus(cols, [task('hacer'), task('hacer')])).toBe('todo'))
  it('una en curso gana a las por hacer', () =>
    expect(boardStatus(cols, [task('hacer'), task('curso')])).toBe('doing'))
  it('sin segunda columna normal nunca está en curso', () =>
    expect(
      boardStatus(
        [
          { id: 'hacer', position: 'a0', isDone: false },
          { id: 'hecho', position: 'a1', isDone: true },
        ],
        [task('hacer')],
      ),
    ).toBe('todo'))
  it('una abierta de una columna que no está cuenta como por hacer', () =>
    expect(boardStatus(cols, [task('otra')])).toBe('todo'))
})
