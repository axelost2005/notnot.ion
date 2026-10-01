import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BoardSummary, Task } from '@notnot/shared'
import { AlignLeft } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { cn } from '@/lib/utils'
import { BoardChip } from '../boards/BoardChip'

type CardProps = {
  task: Task
  done: boolean
  /** En General: el tablero de la tarjeta. */
  board?: BoardSummary
  /** Copia que sigue al puntero mientras se arrastra. */
  overlay?: boolean
}

export function TaskCardBody({ task, done, board, overlay }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md border bg-card px-3 py-2 text-sm leading-snug',
        overlay && 'rotate-1 shadow-lg ring-1 ring-foreground/10',
      )}
    >
      <p className={cn('break-words whitespace-pre-line', done && 'text-muted-foreground')}>
        {task.title}
      </p>
      {(board || task.description || task.noteId) && (
        <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
          {board && <BoardChip board={board} className="-ml-0.5" />}
          {task.description && (
            <AlignLeft className="size-3.5" role="img" aria-label="Tiene descripción" />
          )}
          {task.noteId && <BrandMark className="size-3.5" />}
        </div>
      )}
    </div>
  )
}

export function TaskCardOverlay(props: CardProps) {
  return <TaskCardBody {...props} overlay />
}

type SortableProps = CardProps & { onOpen: (taskId: string) => void }

/** Se arrastra con el mouse, con long-press en touch o con espacio + flechas. */
export function SortableTaskCard({ task, done, onOpen }: SortableProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('touch-manipulation', isDragging && 'opacity-40')}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={task.title}
        onClick={() => onOpen(task.id)}
        // Espacio arrastra (dnd-kit); Enter abre el detalle.
        onKeyUp={(event) => {
          if (event.key === 'Enter') onOpen(task.id)
        }}
        className="cursor-pointer rounded-md outline-none select-none focus-visible:ring-2 focus-visible:ring-ring [&>div]:hover:border-foreground/20"
      >
        <TaskCardBody task={task} done={done} />
      </div>
    </li>
  )
}
