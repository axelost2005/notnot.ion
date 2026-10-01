import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BoardSummary, Task } from '@notnot/shared'
import { Check } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { BoardChip } from '../boards/BoardChip'
import { useToggleTask } from '../notes/api'

type CardProps = {
  task: Task
  done: boolean
  /** En General: el tablero de la tarjeta. */
  board?: BoardSummary
}

const BOX_CLASS = 'size-4 rounded-[4px] border border-foreground/30 bg-card'

function CardText({ task, done, board }: CardProps) {
  return (
    <>
      <p
        className={cn(
          'font-semibold break-words whitespace-pre-line',
          done && 'text-muted-foreground',
        )}
      >
        {task.title}
      </p>
      {task.description && (
        // Una sola línea: los saltos de línea pasan a espacios y el resto se corta con "…".
        <p className="truncate text-muted-foreground">{task.description.replace(/\s+/g, ' ')}</p>
      )}
      {board && <BoardChip board={board} className="mt-1.5 -ml-0.5" />}
    </>
  )
}

/** Tilda y destilda como desde la nota: a "Hecho" o de vuelta a la primera columna. */
function TaskCheckbox({ task, done }: { task: Task; done: boolean }) {
  const toggle = useToggleTask()
  // El cache se actualiza después de un await: sin esto el checkbox vuelve atrás un instante.
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const checked = optimistic ?? done

  function onToggle() {
    setOptimistic(!checked)
    toggle.mutate(
      { taskId: task.id, boardId: task.boardId, done: checked },
      { onSettled: () => setOptimistic(null) },
    )
  }

  return (
    // Fuera de la zona que se arrastra: tocarlo no abre la tarjeta ni empieza a moverla.
    <label className="flex shrink-0 cursor-pointer self-start py-2.5 pr-2.5 pl-3">
      <span className="grid size-4 place-items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`${checked ? 'Destildar' : 'Tildar'} ${task.title}`}
          className={cn(
            'peer col-start-1 row-start-1 cursor-pointer appearance-none outline-none checked:border-foreground checked:bg-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card',
            BOX_CLASS,
          )}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className="pointer-events-none col-start-1 row-start-1 size-3 text-background opacity-0 peer-checked:opacity-100"
        />
      </span>
    </label>
  )
}

type TaskCardProps = CardProps & {
  setNodeRef: (element: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  style?: CSSProperties
  dragging: boolean
  onOpen: (taskId: string) => void
}

/**
 * Una fila: el checkbox a la izquierda y el resto, que se arrastra (mouse, long-press en touch
 * o espacio + flechas) y se abre con un click o Enter.
 */
export function TaskCard({
  task,
  done,
  board,
  setNodeRef,
  attributes,
  listeners,
  style,
  dragging,
  onOpen,
}: TaskCardProps) {
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex touch-manipulation rounded-md border bg-card text-sm leading-snug hover:border-foreground/20 has-[[data-card-handle]:focus-visible]:ring-2 has-[[data-card-handle]:focus-visible]:ring-ring',
        dragging && 'opacity-40',
      )}
    >
      <TaskCheckbox task={task} done={done} />
      <div
        {...attributes}
        {...listeners}
        data-card-handle
        aria-label={task.title}
        onClick={() => onOpen(task.id)}
        // Espacio arrastra (dnd-kit); Enter abre el detalle.
        onKeyUp={(event) => {
          if (event.key === 'Enter') onOpen(task.id)
        }}
        className="min-w-0 flex-1 cursor-pointer py-2 pr-3 outline-none select-none"
      >
        <CardText task={task} done={done} board={board} />
      </div>
    </li>
  )
}

/** La copia que sigue al puntero mientras se arrastra: solo se ve. */
export function TaskCardOverlay({ task, done, board }: CardProps) {
  return (
    <div className="flex rotate-1 rounded-md border bg-card text-sm leading-snug shadow-lg ring-1 ring-foreground/10">
      <span className="py-2.5 pr-2.5 pl-3">
        <span
          className={cn(
            'grid place-items-center',
            BOX_CLASS,
            done && 'border-foreground bg-foreground',
          )}
        >
          {done && <Check aria-hidden="true" strokeWidth={3} className="size-3 text-background" />}
        </span>
      </span>
      <div className="min-w-0 flex-1 py-2 pr-3">
        <CardText task={task} done={done} board={board} />
      </div>
    </div>
  )
}

type SortableProps = CardProps & { onOpen: (taskId: string) => void }

export function SortableTaskCard({ task, done, onOpen }: SortableProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  return (
    <TaskCard
      task={task}
      done={done}
      setNodeRef={setNodeRef}
      attributes={attributes}
      listeners={listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      onOpen={onOpen}
    />
  )
}
