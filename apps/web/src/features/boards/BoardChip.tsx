import type { BoardSummary } from '@notnot/shared'
import { cn } from '@/lib/utils'
import { boardStyle } from './colors'

/** El tablero de una tarea que se ve fuera de su tablero (en una nota, en el historial). */
export function BoardChip({ board, className }: { board: BoardSummary; className?: string }) {
  return (
    <span
      style={boardStyle(board.color)}
      className={cn(
        'inline-flex max-w-32 shrink-0 items-center gap-1 rounded-sm bg-muted px-1.5 text-xs leading-5 text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-(--board)" />
      <span className="truncate">{board.name}</span>
    </span>
  )
}
