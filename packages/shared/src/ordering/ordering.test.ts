import { describe, expect, it } from 'vitest'
import {
  comparePositions,
  positionAfterLast,
  positionBeforeFirst,
  positionBetween,
  positionsBetween,
  sortByPosition,
} from './ordering'

const isSorted = (keys: string[]) =>
  keys.every((key, i) => i === 0 || comparePositions(keys[i - 1]!, key) < 0)

describe('comparePositions', () => {
  it('ordena por código de carácter y no por locale', () => {
    // En ASCII 'Z' (90) va antes que 'a' (97); con localeCompare sería al revés.
    expect(comparePositions('Z', 'a')).toBeLessThan(0)
    expect(comparePositions('a0', 'a0')).toBe(0)
    expect(comparePositions('a1', 'a0')).toBeGreaterThan(0)
  })
})

describe('positionBetween', () => {
  it('genera una clave inicial', () => {
    expect(positionBetween(null, null)).toBe('a0')
  })

  it('queda entre sus vecinos', () => {
    const key = positionBetween('a0', 'a1')
    expect(comparePositions('a0', key)).toBeLessThan(0)
    expect(comparePositions(key, 'a1')).toBeLessThan(0)
  })

  it('soporta insertar muchas veces en el mismo hueco', () => {
    let prev = 'a0'
    const next = 'a1'
    for (let i = 0; i < 200; i++) {
      const key = positionBetween(prev, next)
      expect(comparePositions(prev, key)).toBeLessThan(0)
      expect(comparePositions(key, next)).toBeLessThan(0)
      prev = key
    }
  })

  it('soporta insertar muchas veces al principio y al final', () => {
    const keys = ['a0']
    for (let i = 0; i < 100; i++) {
      keys.unshift(positionBetween(null, keys[0]!))
      keys.push(positionBetween(keys.at(-1)!, null))
    }
    expect(isSorted(keys)).toBe(true)
  })

  it('acepta los vecinos en cualquier orden', () => {
    expect(positionBetween('a1', 'a0')).toBe(positionBetween('a0', 'a1'))
  })

  it('falla si los dos vecinos son la misma clave', () => {
    expect(() => positionBetween('a0', 'a0')).toThrow()
  })
})

describe('positionsBetween', () => {
  it('genera n claves ordenadas y distintas', () => {
    const keys = positionsBetween(null, null, 5)
    expect(keys).toHaveLength(5)
    expect(new Set(keys).size).toBe(5)
    expect(isSorted(keys)).toBe(true)
  })
})

describe('positionAfterLast / positionBeforeFirst', () => {
  const items = [{ position: 'a1' }, { position: 'Zz' }, { position: 'a5' }]

  it('agrega después de la mayor aunque la lista esté desordenada', () => {
    expect(comparePositions(positionAfterLast(items), 'a5')).toBeGreaterThan(0)
  })

  it('agrega antes de la menor', () => {
    expect(comparePositions(positionBeforeFirst(items), 'Zz')).toBeLessThan(0)
  })

  it('funciona con listas vacías', () => {
    expect(positionAfterLast([])).toBe('a0')
    expect(positionBeforeFirst([])).toBe('a0')
  })
})

describe('sortByPosition', () => {
  it('ordena sin mutar la lista original', () => {
    const items = [{ position: 'a2' }, { position: 'Zz' }, { position: 'a0' }]
    expect(sortByPosition(items).map((i) => i.position)).toEqual(['Zz', 'a0', 'a2'])
    expect(items[0]!.position).toBe('a2')
  })
})
