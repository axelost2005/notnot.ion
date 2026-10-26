import { sortByPosition } from '../ordering/ordering'

/** Las columnas fijas de General: agrupan las de todos los tableros por estado. */
export const LANES = [
  { id: 'todo', name: 'Por hacer' },
  { id: 'doing', name: 'En curso' },
  { id: 'done', name: 'Hecho' },
] as const

export type Lane = (typeof LANES)[number]['id']

type ColumnLike = { id: string; position: string; isDone: boolean }

/**
 * Dónde cae una columna de un tablero en General: la de terminadas en "Hecho", la primera
 * normal en "Por hacer" y las otras normales en "En curso".
 */
export function laneOf(column: ColumnLike, boardColumns: readonly ColumnLike[]): Lane {
  if (column.isDone) return 'done'
  const first = sortByPosition(boardColumns.filter((c) => !c.isDone))[0]
  return first?.id === column.id ? 'todo' : 'doing'
}

/**
 * El estado de un tablero según sus tareas abiertas: "al día" si no le queda ninguna (también
 * sin tareas), "en curso" si alguna está en una columna en curso y si no, "por hacer".
 */
export function boardStatus(
  boardColumns: readonly ColumnLike[],
  boardTasks: readonly { columnId: string; completedAt: string | null }[],
): Lane {
  const open = boardTasks.filter((t) => t.completedAt === null)
  if (open.length === 0) return 'done'
  const doing = open.some((t) => {
    const column = boardColumns.find((c) => c.id === t.columnId)
    return column !== undefined && laneOf(column, boardColumns) === 'doing'
  })
  return doing ? 'doing' : 'todo'
}

/**
 * A qué columna de su tablero va una tarjeta que se suelta en `lane`. "En curso" es la segunda
 * columna normal: si el tablero no tiene, no hay dónde ponerla.
 */
export function columnForLane<T extends ColumnLike>(
  boardColumns: readonly T[],
  lane: Lane,
): T | undefined {
  if (lane === 'done') return boardColumns.find((c) => c.isDone)
  const normal = sortByPosition(boardColumns.filter((c) => !c.isDone))
  return lane === 'todo' ? normal[0] : normal[1]
}
