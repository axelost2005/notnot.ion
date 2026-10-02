import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Column, Lane, Task } from '@notnot/shared'
import { AddTaskComposer } from './AddTaskComposer'
import { ColumnHeader } from './ColumnHeader'
import { LaneSection } from './LaneSection'
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
  return (
    <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
      <LaneSection
        id={column.id}
        labelledBy={`column-${column.id}`}
        header={
          <ColumnHeader
            boardId={boardId}
            column={column}
            lane={lane}
            count={tasks.length}
            deleteBlockedReason={deleteBlockedReason}
          />
        }
        footer={<AddTaskComposer boardId={boardId} columnId={column.id} columnName={column.name} />}
      >
        {tasks.map((task) => (
          <SortableTaskCard key={task.id} task={task} done={column.isDone} onOpen={onOpenTask} />
        ))}
      </LaneSection>
    </SortableContext>
  )
}
