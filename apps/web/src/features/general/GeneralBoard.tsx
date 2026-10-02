import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  columnForLane,
  comparePositions,
  laneOf,
  LANES,
  type BoardSummary,
  type Column,
  type Lane,
  type Task,
} from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ErrorState } from '@/components/ErrorState'
import { cn } from '@/lib/utils'
import { boardQuery, boardsQuery } from '../boards/api'
import { useMoveTask } from '../kanban/api'
import { AddTaskComposer } from '../kanban/AddTaskComposer'
import { LaneSection, laneHeaderClass, laneNameClass, lanesClass } from '../kanban/LaneSection'
import { laneTitleClass } from '../kanban/laneColors'
import { LanesSkeleton } from '../kanban/LanesSkeleton'
import { TaskCard, TaskCardOverlay } from '../kanban/TaskCard'
import { TaskDetailDialog } from '../kanban/TaskDetailDialog'
import { generalQuery } from './api'

const isLane = (id: UniqueIdentifier): id is Lane => LANES.some((lane) => lane.id === id)

/**
 * El kanban de General: las tarjetas de todos los tableros activos en tres columnas por
 * estado. Arrastrar una a otra columna la mueve al final de la columna que corresponde en su
 * propio tablero. No se reordena: dentro de cada columna van agrupadas por tablero.
 */
export function GeneralBoard({ board }: { board: BoardSummary }) {
  const general = useQuery(generalQuery)
  const boards = useQuery(boardsQuery)
  const move = useMoveTask()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeId, setActiveId] = useState<string | null>(null)
  const lastDragEnd = useRef(0)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Long-press en touch: un toque corto abre la tarjeta y el scroll sigue funcionando.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  const view = useMemo(() => {
    const columns = general.data?.columns ?? []
    const tasks = general.data?.tasks ?? []
    const columnsById = new Map(columns.map((c) => [c.id, c]))
    const columnsByBoard = new Map<string, Column[]>()
    for (const column of columns) {
      columnsByBoard.set(column.boardId, [...(columnsByBoard.get(column.boardId) ?? []), column])
    }
    // En el orden de la sidebar (General primero), después por columna y por posición.
    const boardOrder = new Map(boards.data?.map((b, index) => [b.id, index]))
    const order = (a: Task, b: Task) =>
      (boardOrder.get(a.boardId) ?? Infinity) - (boardOrder.get(b.boardId) ?? Infinity) ||
      comparePositions(
        columnsById.get(a.columnId)!.position,
        columnsById.get(b.columnId)!.position,
      ) ||
      comparePositions(a.position, b.position)

    const lanes: Record<Lane, Task[]> = { todo: [], doing: [], done: [] }
    const laneByTask = new Map<string, Lane>()
    for (const task of tasks) {
      const column = columnsById.get(task.columnId)
      if (!column) continue
      const lane = laneOf(column, columnsByBoard.get(task.boardId) ?? [])
      lanes[lane].push(task)
      laneByTask.set(task.id, lane)
    }
    for (const lane of Object.values(lanes)) lane.sort(order)

    return {
      lanes,
      laneByTask,
      columnsByBoard,
      tasksById: new Map(tasks.map((t) => [t.id, t])),
      boardsById: new Map(boards.data?.map((b) => [b.id, b])),
    }
  }, [general.data, boards.data])

  const openId = searchParams.get('tarjeta')
  const openTask = openId ? view.tasksById.get(openId) : undefined
  // El detalle es el de siempre: necesita el tablero de la tarjeta.
  const openBoard = useQuery({
    ...boardQuery(openTask?.boardId ?? ''),
    enabled: openTask !== undefined,
  })

  if (general.isPending || boards.isPending) return <LanesSkeleton />
  if (general.isError) {
    return (
      <ErrorState
        title="No se pudo cargar General."
        message={general.error.message}
        onRetry={() => void general.refetch()}
      />
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    lastDragEnd.current = performance.now()
    setActiveId(null)
    const task = view.tasksById.get(String(active.id))
    if (!task || !over || !isLane(over.id) || view.laneByTask.get(task.id) === over.id) return

    const target = columnForLane(view.columnsByBoard.get(task.boardId) ?? [], over.id)
    if (!target) {
      const name = view.boardsById.get(task.boardId)?.name ?? 'Ese tablero'
      toast.error(`${name} no tiene columna «En curso».`)
      return
    }
    move.mutate({ task, columnId: target.id, boardId: task.boardId, prevId: null, nextId: null })
  }

  function openCard(taskId: string) {
    // Soltar una tarjeta arriba de sí misma dispara un click: no es para abrirla.
    if (performance.now() - lastDragEnd.current < 250) return
    setSearchParams((params) => {
      params.set('tarjeta', taskId)
      return params
    })
  }

  function closeCard() {
    setSearchParams(
      (params) => {
        params.delete('tarjeta')
        return params
      },
      { replace: true },
    )
  }

  const titleOf = (id: UniqueIdentifier) => view.tasksById.get(String(id))?.title ?? 'la tarjeta'
  const laneName = (id: UniqueIdentifier) => LANES.find((lane) => lane.id === id)?.name ?? ''
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Agarraste ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} está sobre ${laneName(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Soltaste ${titleOf(active.id)} en ${laneName(over.id)}.`
        : `Soltaste ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelaste el movimiento de ${titleOf(active.id)}.`,
  }

  // Las tarjetas nuevas que se agregan acá son de General, en la columna que corresponde.
  const generalColumn = (lane: Lane) => columnForLane(view.columnsByBoard.get(board.id) ?? [], lane)
  const activeTask = activeId ? view.tasksById.get(activeId) : undefined
  const chipFor = (task: Task) =>
    task.boardId === board.id ? undefined : view.boardsById.get(task.boardId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Arrastrá la tarjeta a otra columna para cambiarle el estado en su tablero. Enter la abre para moverla desde ahí.',
        },
      }}
    >
      <div className={lanesClass}>
        {LANES.map((lane) => {
          const target = generalColumn(lane.id)
          return (
            <GeneralLane
              key={lane.id}
              lane={lane}
              count={view.lanes[lane.id].length}
              footer={
                target && (
                  <AddTaskComposer boardId={board.id} columnId={target.id} columnName={lane.name} />
                )
              }
            >
              {view.lanes[lane.id].map((task) => (
                <GeneralCard
                  key={task.id}
                  task={task}
                  board={chipFor(task)}
                  done={lane.id === 'done'}
                  onOpen={openCard}
                />
              ))}
            </GeneralLane>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCardOverlay
            task={activeTask}
            board={chipFor(activeTask)}
            done={view.laneByTask.get(activeTask.id) === 'done'}
          />
        ) : null}
      </DragOverlay>

      {openBoard.data && (
        <TaskDetailDialog board={openBoard.data} taskId={openId} onClose={closeCard} />
      )}
    </DndContext>
  )
}

type LaneProps = {
  lane: (typeof LANES)[number]
  count: number
  footer?: ReactNode
  children: ReactNode
}

function GeneralLane({ lane, count, footer, children }: LaneProps) {
  return (
    <LaneSection
      id={lane.id}
      labelledBy={`lane-${lane.id}`}
      header={
        <header className={laneHeaderClass}>
          <h2 id={`lane-${lane.id}`} className={cn(laneNameClass, laneTitleClass[lane.id])}>
            {lane.name}
          </h2>
          {lane.id === 'done' && (
            <Check
              className="size-3.5 shrink-0 text-muted-foreground"
              role="img"
              aria-label="Columna de terminadas"
            />
          )}
          <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
        </header>
      }
      footer={footer}
    >
      {children}
    </LaneSection>
  )
}

type CardProps = {
  task: Task
  board: BoardSummary | undefined
  done: boolean
  onOpen: (taskId: string) => void
}

/** Se arrastra con el mouse o con long-press en touch; Enter (o un click) la abre. */
function GeneralCard({ task, board, done, onOpen }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

  return (
    <TaskCard
      task={task}
      done={done}
      board={board}
      setNodeRef={setNodeRef}
      attributes={attributes}
      listeners={listeners}
      dragging={isDragging}
      onOpen={onOpen}
    />
  )
}
