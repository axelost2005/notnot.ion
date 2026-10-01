import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

type Positioned = { position: string }

/**
 * Las claves de fractional indexing se ordenan por código de carácter.
 * No usar localeCompare: con algunos locales 'a' < 'B' y se rompe el orden.
 */
export function comparePositions(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

export function sortByPosition<T extends Positioned>(items: readonly T[]): T[] {
  return [...items].sort((x, y) => comparePositions(x.position, y.position))
}

/** Clave entre `prev` y `next`; `null` significa "sin vecino" de ese lado. */
export function positionBetween(prev: string | null, next: string | null): string {
  return generateKeyBetween(prev, next)
}

/** `count` claves ordenadas entre `prev` y `next`. */
export function positionsBetween(
  prev: string | null,
  next: string | null,
  count: number,
): string[] {
  return generateNKeysBetween(prev, next, count)
}

/** Clave para agregar al final de una lista. */
export function positionAfterLast(items: readonly Positioned[]): string {
  const last = items.reduce<string | null>(
    (max, item) => (max === null || comparePositions(item.position, max) > 0 ? item.position : max),
    null,
  )
  return positionBetween(last, null)
}

/** Clave para agregar al principio de una lista. */
export function positionBeforeFirst(items: readonly Positioned[]): string {
  const first = items.reduce<string | null>(
    (min, item) => (min === null || comparePositions(item.position, min) < 0 ? item.position : min),
    null,
  )
  return positionBetween(null, first)
}
