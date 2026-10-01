import { positionAfterLast, positionBetween, sortByPosition } from './ordering'

type Item = { id: string; position: string }

export type Slot = { prevId: string | null; nextId: string | null }

/** Vecinos del lugar `index` en una lista (ordenada y sin la tarjeta que se mueve). */
export function slotAt(list: readonly { id: string }[], index: number): Slot {
  return { prevId: list[index - 1]?.id ?? null, nextId: list[index]?.id ?? null }
}

/**
 * ¿`prevId` y `nextId` son vecinos de verdad en `siblings`? Sin ninguno de los dos vale
 * siempre (va al final). Si no son vecinos, el cliente tenía una vista vieja.
 */
export function isValidSlot(siblings: readonly Item[], { prevId, nextId }: Slot): boolean {
  if (prevId === null && nextId === null) return true
  const sorted = sortByPosition(siblings)
  const prevIndex = prevId === null ? -1 : sorted.findIndex((item) => item.id === prevId)
  const nextIndex = nextId === null ? sorted.length : sorted.findIndex((item) => item.id === nextId)
  if (prevIndex === -1 && prevId !== null) return false
  if (nextIndex === -1) return false
  return nextIndex === prevIndex + 1
}

/** Posición nueva para un slot válido de `siblings` (sin la tarjeta que se mueve). */
export function positionForSlot(siblings: readonly Item[], { prevId, nextId }: Slot): string {
  if (prevId === null && nextId === null) return positionAfterLast(siblings)
  const prev = prevId === null ? null : siblings.find((item) => item.id === prevId)
  const next = nextId === null ? null : siblings.find((item) => item.id === nextId)
  if (prev === undefined || next === undefined) throw new Error('El vecino no está en la lista')
  return positionBetween(prev?.position ?? null, next?.position ?? null)
}
