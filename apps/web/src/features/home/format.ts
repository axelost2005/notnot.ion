import type { BoardSummary, Task } from '@notnot/shared'
import { shortDay } from '../today/format'

/** "Anotada en Pepito, para hoy", "3 tareas anotadas en Pepito y General". */
export function capturedMessage(tasks: Task[], boards: readonly BoardSummary[], today: string) {
  const names = [...new Set(tasks.map((t) => boards.find((b) => b.id === t.boardId)?.name))]
    .filter((name) => name !== undefined)
    .join(' y ')
  const day = tasks[0]?.day ?? null
  const when = day === null ? '' : `, para ${day <= today ? 'hoy' : shortDay(day, today)}`
  return tasks.length === 1
    ? `Anotada en ${names}${when}`
    : `${tasks.length} tareas anotadas en ${names}${when}`
}
