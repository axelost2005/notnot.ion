import { describe, expect, it } from 'vitest'
import { isValidSlot, positionForSlot, slotAt } from './moves'
import { comparePositions, sortByPosition } from './ordering'

const list = [
  { id: 'a', position: 'a0' },
  { id: 'b', position: 'a1' },
  { id: 'c', position: 'a2' },
]

describe('slotAt', () => {
  it('arriba de todo', () => {
    expect(slotAt(list, 0)).toEqual({ prevId: null, nextId: 'a' })
  })

  it('en el medio', () => {
    expect(slotAt(list, 2)).toEqual({ prevId: 'b', nextId: 'c' })
  })

  it('al final', () => {
    expect(slotAt(list, 3)).toEqual({ prevId: 'c', nextId: null })
  })

  it('en una lista vacía', () => {
    expect(slotAt([], 0)).toEqual({ prevId: null, nextId: null })
  })
})

describe('isValidSlot', () => {
  it.each([
    [{ prevId: null, nextId: 'a' }, true],
    [{ prevId: 'a', nextId: 'b' }, true],
    [{ prevId: 'c', nextId: null }, true],
    [{ prevId: null, nextId: null }, true],
    [{ prevId: 'a', nextId: 'c' }, false],
    [{ prevId: 'b', nextId: 'a' }, false],
    [{ prevId: null, nextId: 'b' }, false],
    [{ prevId: 'b', nextId: null }, false],
    [{ prevId: 'x', nextId: null }, false],
    [{ prevId: null, nextId: 'x' }, false],
  ])('%j → %s', (slot, valid) => {
    expect(isValidSlot(list, slot)).toBe(valid)
  })

  it('no depende del orden en que vengan los elementos', () => {
    expect(isValidSlot([...list].reverse(), { prevId: 'a', nextId: 'b' })).toBe(true)
  })
})

describe('positionForSlot', () => {
  const place = (slot: Parameters<typeof positionForSlot>[1]) => {
    const position = positionForSlot(list, slot)
    return sortByPosition([...list, { id: 'new', position }]).map((item) => item.id)
  }

  it('arriba de todo', () => {
    expect(place({ prevId: null, nextId: 'a' })).toEqual(['new', 'a', 'b', 'c'])
  })

  it('entre dos', () => {
    expect(place({ prevId: 'b', nextId: 'c' })).toEqual(['a', 'b', 'new', 'c'])
  })

  it('al final', () => {
    expect(place({ prevId: 'c', nextId: null })).toEqual(['a', 'b', 'c', 'new'])
  })

  it('sin vecinos va al final', () => {
    expect(place({ prevId: null, nextId: null })).toEqual(['a', 'b', 'c', 'new'])
  })

  it('en una columna vacía', () => {
    expect(positionForSlot([], { prevId: null, nextId: null })).toBe('a0')
  })

  it('falla si el vecino no está', () => {
    expect(() => positionForSlot(list, { prevId: 'x', nextId: null })).toThrow()
  })

  it('aguanta muchos movimientos seguidos al mismo hueco', () => {
    let items = [...list]
    for (let i = 0; i < 50; i++) {
      const sorted = sortByPosition(items)
      const position = positionForSlot(sorted, { prevId: sorted[0]!.id, nextId: sorted[1]!.id })
      items = [...items, { id: `n${i}`, position }]
    }
    const keys = sortByPosition(items).map((item) => item.position)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.every((key, i) => i === 0 || comparePositions(keys[i - 1]!, key) < 0)).toBe(true)
  })
})
