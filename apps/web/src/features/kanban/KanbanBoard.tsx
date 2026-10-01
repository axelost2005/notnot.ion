import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { slotAt, sortByPosition, type BoardDetail, type Task } from '@notnot/shared'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AddColumn } from './AddColumn'
import { useMoveTask } from './api'
import { KanbanColumn } from './KanbanColumn'
import { TaskCardOverlay } from './TaskCard'
import { TaskDetailDialog } from './TaskDetailDialog'

type Items = Record<string, string[]>

/**
 * Mientras se arrastra, el orden vive en `drag.items`. Al soltar se mantiene hasta que el
 * cache cambia (el update optimista ya está aplicado), así la tarjeta no "salta" un frame.
 */
type DragState = { items: Items; basedOn: Task[] }

export function KanbanBoard({ board }: { board: BoardDetail }) {
  const move = useMoveTask()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const lastDragEnd = useRef(0)

  const columns = useMemo(() => sortByPosition(board.columns), [board.columns])
  const tasksById = useMemo(() => new Map(board.tasks.map((t) => [t.id, t])), [board.tasks])
  const serverItems = useMemo(() => {
    const items: Items = {}
    for (const column of columns) {
      items[column.id] = sortByPosition(board.tasks.filter((t) => t.columnId === column.id)).map(
        (t) => t.id,
      )
    }
    return items
  }, [columns, board.tasks])

  const items =
    drag && (activeId !== null || drag.basedOn === board.tasks) ? drag.items : serverItems

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Long-press en touch: un toque corto abre la tarjeta y el scroll sigue funcionando.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  const findColumn = (id: UniqueIdentifier, source: Items) => {
    const key = String(id)
    if (key in source) return key
    return Object.keys(source).find((columnId) => source[columnId]!.includes(key))
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
    setDrag({ items: serverItems, basedOn: board.tasks })
  }

  // Al pasar a otra columna, la tarjeta se mueve de lista para que se vea el hueco.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    setDrag((current) => {
      if (!current) return current
      const from = findColumn(active.id, current.items)
      const to = findColumn(over.id, current.items)
      if (!from || !to || from === to) return current
      const target = current.items[to]!
      const overIndex = target.indexOf(String(over.id))
      const translated = active.rect.current.translated
      const below = translated !== null && translated.top > over.rect.top + over.rect.height / 2
      const index = overIndex === -1 ? target.length : overIndex + (below ? 1 : 0)
      return {
        ...current,
        items: {
          ...current.items,
          [from]: current.items[from]!.filter((id) => id !== active.id),
          [to]: [...target.slice(0, index), String(active.id), ...target.slice(index)],
        },
      }
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    lastDragEnd.current = performance.now()
    setActiveId(null)
    const task = tasksById.get(String(active.id))
    const current = drag?.items
    const to = over && current ? findColumn(over.id, current) : undefined
    if (!task || !current || !to || !over) return setDrag(null)

    let ids = current[to]!
    const oldIndex = ids.indexOf(task.id)
    const overIndex = over.id === to ? ids.length - 1 : ids.indexOf(String(over.id))
    if (overIndex !== -1 && oldIndex !== overIndex) ids = arrayMove(ids, oldIndex, overIndex)

    const index = ids.indexOf(task.id)
    const unchanged = to === task.columnId && serverItems[to]!.indexOf(task.id) === index
    if (unchanged) return setDrag(null)

    setDrag({ items: { ...current, [to]: ids }, basedOn: board.tasks })
    const slot = slotAt(
      ids.filter((id) => id !== task.id).map((id) => ({ id })),
      index,
    )
    move.mutate(
      { task, columnId: to, boardId: board.id, ...slot },
      { onSettled: () => setDrag(null) },
    )
  }

  function openTask(taskId: string) {
    // Soltar una tarjeta arriba de sí misma dispara un click: no es para abrirla.
    if (performance.now() - lastDragEnd.current < 250) return
    setSearchParams((params) => {
      params.set('tarjeta', taskId)
      return params
    })
  }

  function closeTask() {
    setSearchParams(
      (params) => {
        params.delete('tarjeta')
        return params
      },
      { replace: true },
    )
  }

  const titleOf = (id: UniqueIdentifier) => tasksById.get(String(id))?.title ?? 'la tarjeta'
  const placeOf = (id: UniqueIdentifier) => {
    const columnId = findColumn(id, items)
    const column = columns.find((c) => c.id === columnId)
    if (!column) return 'fuera de las columnas'
    const position = items[column.id]!.indexOf(String(id)) + 1
    return position > 0
      ? `${column.name}, posición ${position} de ${items[column.id]!.length}`
      : `la columna ${column.name}`
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Agarraste ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} está en ${placeOf(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Soltaste ${titleOf(active.id)} en ${placeOf(over.id)}.`
        : `Soltaste ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelaste el movimiento de ${titleOf(active.id)}.`,
  }

  const activeTask = activeId ? tasksById.get(activeId) : undefined
  const normalColumns = columns.filter((c) => !c.isDone).length

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        setDrag(null)
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Para mover la tarjeta, presioná espacio. Movela con las flechas y soltala con espacio. Escape cancela. Enter la abre.',
        },
      }}
    >
      {/* En mobile, una columna por vez con swipe (scroll-snap). */}
      <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto p-4 max-md:snap-x max-md:snap-mandatory max-md:scroll-px-4 max-md:[scrollbar-width:none]">
        {columns.map((column) => {
          const columnTasks = (items[column.id] ?? [])
            .map((id) => tasksById.get(id))
            .filter((task) => task !== undefined)
          const deleteBlockedReason = column.isDone
            ? 'Es la de terminadas'
            : columnTasks.length > 0
              ? 'Tiene tarjetas'
              : normalColumns <= 1
                ? 'Hace falta al menos otra columna'
                : null
          return (
            <KanbanColumn
              key={column.id}
              boardId={board.id}
              column={column}
              tasks={columnTasks}
              deleteBlockedReason={deleteBlockedReason}
              onOpenTask={openTask}
            />
          )
        })}
        <AddColumn boardId={board.id} />
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCardOverlay
            task={activeTask}
            done={columns.find((c) => c.id === activeTask.columnId)?.isDone ?? false}
          />
        ) : null}
      </DragOverlay>

      <TaskDetailDialog board={board} taskId={searchParams.get('tarjeta')} onClose={closeTask} />
    </DndContext>
  )
}
