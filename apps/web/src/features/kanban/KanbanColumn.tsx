import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Column, Lane, Task } from '@notnot/shared'
import { cn } from '@/lib/utils'
import { AddTaskComposer } from './AddTaskComposer'
import { ColumnHeader } from './ColumnHeader'
import { SortableTaskCard } from './TaskCard'

type Props = {
  boardId: string
  column: Column
  lane: Lane
  tasks: Task[]
  deleteBlockedReason: string | null
  onOpenTask: (taskId: string) => void
}

export function KanbanColumn({
  boardId,
  column,
  lane,
  tasks,
  deleteBlockedReason,
  onOpenTask,
}: Props) {
  // Toda la columna recibe tarjetas (también el título y el pie), aunque esté vacía.
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${column.id}`}
      className={cn(
        'flex h-full w-66 shrink-0 flex-col rounded-lg bg-lane transition-colors max-md:w-[85vw] max-md:snap-start',
        isOver && 'bg-accent',
      )}
    >
      <ColumnHeader
        boardId={boardId}
        column={column}
        lane={lane}
        count={tasks.length}
        deleteBlockedReason={deleteBlockedReason}
      />
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex min-h-16 flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} done={column.isDone} onOpen={onOpenTask} />
          ))}
        </ol>
      </SortableContext>
      <AddTaskComposer boardId={boardId} columnId={column.id} columnName={column.name} />
    </section>
  )
}
