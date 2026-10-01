import type { BoardSummary, Task } from '@notnot/shared'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { boardsQuery } from '../boards/api'
import { BoardChip } from '../boards/BoardChip'
import { historyQuery } from './api'
import { dayKey, dayLabel } from './format'

type Props = {
  /** Sin tablero: el historial de todos, con el chip de cada uno. */
  board?: BoardSummary
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HistorySheet({ board, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Historial</SheetTitle>
          <SheetDescription>
            {board
              ? `Lo que terminaste en ${board.name} antes de hoy.`
              : 'Lo que terminaste antes de hoy, en todos los tableros.'}
          </SheetDescription>
        </SheetHeader>
        <HistoryList boardId={board?.id} showBoards={!board} />
      </SheetContent>
    </Sheet>
  )
}

/** Las del historial siempre están terminadas. */
const finishedAt = (task: Task) => task.completedAt ?? task.updatedAt

function HistoryList({ boardId, showBoards }: { boardId?: string; showBoards: boolean }) {
  const history = useInfiniteQuery(historyQuery(boardId))
  const boards = useQuery(boardsQuery)

  // Vienen de la más reciente a la más vieja: se agrupan por día sin reordenar.
  const days = useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const task of history.data?.pages.flatMap((page) => page.tasks) ?? []) {
      const key = dayKey(finishedAt(task))
      groups.set(key, [...(groups.get(key) ?? []), task])
    }
    return [...groups].map(([key, tasks]) => ({ key, tasks }))
  }, [history.data])
  const boardsById = useMemo(() => new Map(boards.data?.map((b) => [b.id, b])), [boards.data])

  if (history.isPending) {
    return (
      <div className="grid gap-3 p-4" aria-label="Cargando historial">
        {[72, 56, 64].map((width) => (
          <Skeleton key={width} className="h-4" style={{ width: `${width}%` }} />
        ))}
      </div>
    )
  }
  if (history.isError) {
    return (
      <ErrorState
        title="No se pudo cargar el historial."
        message={history.error.message}
        onRetry={() => void history.refetch()}
      />
    )
  }
  if (days.length === 0) {
    return (
      <div className="grid gap-1 p-4 text-[13px]">
        <p className="font-medium">Todavía no hay nada acá.</p>
        <p className="text-muted-foreground">Lo que termines hoy pasa acá mañana.</p>
      </div>
    )
  }

  const now = new Date()
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      {days.map(({ key, tasks }) => (
        <section key={key}>
          <h3 className="sticky top-0 bg-popover pt-4 pb-1.5 text-xs font-medium text-muted-foreground">
            {dayLabel(finishedAt(tasks[0]!), now)}
          </h3>
          <ul className="grid gap-1.5">
            {tasks.map((task) => {
              const board = showBoards ? boardsById.get(task.boardId) : undefined
              return (
                <li key={task.id} className="flex items-start gap-2 leading-snug">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 break-words">{task.title}</span>
                  {board && <BoardChip board={board} />}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {history.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          {history.isFetchingNextPage ? 'Cargando…' : 'Ver anteriores'}
        </Button>
      )}
    </div>
  )
}
