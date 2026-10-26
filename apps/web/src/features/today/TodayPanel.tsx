import { groupToday, laneOf, type BoardSummary, type Overview, type Task } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Sun } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { boardQuery, boardsQuery } from '../boards/api'
import { boardStyle } from '../boards/colors'
import { today as getToday } from '../finance/format'
import { overviewQuery } from '../home/api'
import { PanelHeader } from '../home/Panel'
import { capturedMessage } from '../home/format'
import { QuickCapture } from '../home/QuickCapture'
import { SunButton } from '../kanban/SunButton'
import { TaskCheckbox } from '../kanban/TaskCard'
import { TaskDetailDialog } from '../kanban/TaskDetailDialog'
import { carriedFrom, dayHeading, longDay } from './format'

const SECTION_TITLE_CLASS = 'mb-2 flex items-baseline gap-2 px-1 text-[13px] font-semibold'

/** `/hoy`: lo de hoy de todos los tableros, lo que se tachó hoy y los días que vienen. */
export function TodayPanel() {
  const overview = useQuery(overviewQuery)
  const boards = useQuery(boardsQuery)
  const [searchParams, setSearchParams] = useSearchParams()
  const today = getToday()

  function openTask(taskId: string) {
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

  // Lo que se anota sin día no aparece acá: se avisa a dónde fue.
  function onCreated(tasks: Task[]) {
    const elsewhere = tasks.filter((task) => task.day === null)
    if (elsewhere.length) toast.success(capturedMessage(elsewhere, boards.data ?? [], today))
  }

  return (
    <>
      <title>Hoy – notnot.ion</title>
      <PanelHeader>
        <Sun aria-hidden="true" className="size-4 shrink-0 text-sun-ink" />
        <h1 className="text-[15px] font-semibold tracking-tight max-md:text-[17px]">Hoy</h1>
        <span className="min-w-0 truncate text-[13px] text-muted-foreground first-letter:uppercase">
          {longDay(today)}
        </span>
        <span className="ml-auto" />
      </PanelHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 pt-5 pb-10 max-md:gap-5 max-md:px-3 max-md:pt-3">
          <QuickCapture forToday autoFocus onCreated={onCreated} className="max-w-2xl" />
          {overview.isPending || boards.isPending ? (
            <div className="grid gap-3" aria-label="Cargando lo de hoy">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          ) : overview.isError || boards.isError ? (
            <ErrorState
              title="No se pudo cargar lo de hoy."
              message={(overview.error ?? boards.error)?.message ?? ''}
              onRetry={() => void overview.refetch()}
            />
          ) : (
            <TodayLists
              overview={overview.data}
              boards={boards.data}
              today={today}
              onOpen={openTask}
            />
          )}
        </div>
      </div>
      <TodayTaskDetail taskId={searchParams.get('tarjeta')} onClose={closeTask} />
    </>
  )
}

type ListsProps = {
  overview: Overview
  boards: BoardSummary[]
  today: string
  onOpen: (taskId: string) => void
}

function TodayLists({ overview, boards, today, onOpen }: ListsProps) {
  const [doneOpen, setDoneOpen] = useState(false)
  const groups = groupToday(overview.tasks, today)
  // En el orden de los cuadrados: los tableros y General al final.
  const ordered = [...boards.filter((b) => !b.isGeneral), ...boards.filter((b) => b.isGeneral)]
  const byBoard = ordered
    .map((board) => ({ board, tasks: groups.today.filter((t) => t.boardId === board.id) }))
    .filter((group) => group.tasks.length > 0)
  const rowProps = { overview, boards, today, onOpen }

  return (
    <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] max-md:gap-6">
      <section aria-labelledby="hoy-para-hoy">
        <h2 id="hoy-para-hoy" className={SECTION_TITLE_CLASS}>
          Para hoy
          <span className="font-normal text-muted-foreground tabular-nums">
            {groups.today.length}
          </span>
        </h2>
        {byBoard.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-5">
            <p className="font-medium">Nada para hoy.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Anotá arriba o tocá el sol de cualquier tarea. Lo que no tachás pasa solo al día
              siguiente.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {byBoard.map(({ board, tasks }) => (
              <div key={board.id} style={boardStyle(board.color)}>
                <Link
                  to={`/b/${board.slug}`}
                  className="mb-1 flex w-fit items-center gap-2 rounded-md px-1 text-[13px] font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden="true" className="size-2 rounded-full bg-(--board)" />
                  {board.name}
                  <span className="text-muted-foreground tabular-nums">{tasks.length}</span>
                </Link>
                <TaskList tasks={tasks} {...rowProps} />
              </div>
            ))}
          </div>
        )}

        {groups.done.length > 0 && (
          <div className="mt-5">
            <button
              type="button"
              aria-expanded={doneOpen}
              onClick={() => setDoneOpen(!doneOpen)}
              className="group mb-2 flex items-center gap-1 rounded-md px-1 text-[13px] font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="size-3.5 transition-transform group-aria-expanded:rotate-90" />
              Hechas hoy
              <span className="font-normal tabular-nums">{groups.done.length}</span>
            </button>
            {doneOpen && <TaskList tasks={groups.done} showBoard {...rowProps} />}
          </div>
        )}
      </section>

      <section aria-labelledby="hoy-proximos">
        <h2 id="hoy-proximos" className={SECTION_TITLE_CLASS}>
          Próximos días
        </h2>
        {groups.upcoming.length === 0 ? (
          <p className="px-1 text-[13px] text-muted-foreground">
            Nada todavía. Elegí un día en los chips o en el detalle de una tarea.
          </p>
        ) : (
          <div className="grid gap-4">
            {groups.upcoming.map((group) => (
              <div key={group.day}>
                <h3 className="mb-1 px-1 text-[13px] font-medium">
                  {dayHeading(group.day, today)}
                </h3>
                <TaskList tasks={group.tasks} showBoard {...rowProps} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

type TaskListProps = ListsProps & { tasks: Task[]; showBoard?: boolean }

function TaskList({ tasks, overview, boards, today, onOpen, showBoard = false }: TaskListProps) {
  return (
    <ul className="overflow-hidden rounded-xl border bg-card">
      {tasks.map((task) => {
        const columns = overview.columns.filter((c) => c.boardId === task.boardId)
        const column = columns.find((c) => c.id === task.columnId)
        const doing = column !== undefined && laneOf(column, columns) === 'doing'
        const board = showBoard ? boards.find((b) => b.id === task.boardId) : undefined
        return (
          <TodayRow
            key={task.id}
            task={task}
            doing={doing}
            board={board}
            carried={task.day !== null && task.day < today ? carriedFrom(task.day, today) : null}
            onOpen={onOpen}
          />
        )
      })}
    </ul>
  )
}

type RowProps = {
  task: Task
  doing: boolean
  /** Fuera de su grupo (lo que viene, lo tachado): el tablero al lado. */
  board?: BoardSummary
  /** De qué día viene si quedó pendiente: "de ayer". */
  carried: string | null
  onOpen: (taskId: string) => void
}

function TodayRow({ task, doing, board, carried, onOpen }: RowProps) {
  const done = task.completedAt !== null
  const meta = [
    doing && !done && (
      <span key="doing" className="font-medium text-status-doing">
        En curso
      </span>
    ),
    carried && !done && <span key="carried">{carried}</span>,
    board && (
      <span key="board" style={boardStyle(board.color)} className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-(--board)" />
        {board.name}
      </span>
    ),
  ].filter(Boolean)

  return (
    <li className="group/row flex items-start border-b text-sm leading-snug last:border-b-0 max-md:text-[15px]">
      <TaskCheckbox task={task} done={done} />
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="min-w-0 flex-1 py-2 pr-1 text-left outline-none focus-visible:underline max-md:py-3"
      >
        <span className={cn('block break-words', done && 'text-muted-foreground')}>
          {task.title}
        </span>
        {meta.length > 0 && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground">
            {meta}
          </span>
        )}
      </button>
      {!done && (
        <SunButton
          task={task}
          showDay={false}
          className="self-start py-1.5 pr-1.5 max-md:py-2 max-md:pr-2"
        />
      )}
    </li>
  )
}

/** El detalle de siempre, encima de Hoy: hace falta el tablero de la tarea. */
function TodayTaskDetail({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const overview = useQuery(overviewQuery)
  const task = overview.data?.tasks.find((t) => t.id === taskId)
  const board = useQuery({ ...boardQuery(task?.boardId ?? ''), enabled: task !== undefined })
  if (!task || !board.data) return null
  return <TaskDetailDialog board={board.data} taskId={task.id} onClose={onClose} />
}
