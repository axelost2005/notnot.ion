import type { BoardDetail, BoardSummary } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { boardQuery, boardsQuery, useUpdateBoard } from './api'
import { BoardActionsMenu } from './BoardActionsMenu'
import { boardStyle } from './colors'
import { writeLastBoard } from './lastBoard'

export function BoardPage() {
  const { slug } = useParams()
  const boards = useQuery(boardsQuery)

  if (boards.isPending) return <BoardSkeleton />
  if (boards.isError) {
    return (
      <ErrorState
        title="No se pudieron cargar los tableros."
        message={boards.error.message}
        onRetry={() => void boards.refetch()}
      />
    )
  }

  const board = boards.data.find((b) => b.slug === slug)
  if (!board) {
    return (
      <div className="grid max-w-sm gap-2 p-6">
        <title>Tablero no encontrado – notnot.ion</title>
        <p className="font-medium">No hay ningún tablero en esta dirección.</p>
        <p className="text-[13px] text-muted-foreground">
          Puede que lo hayan renombrado o borrado.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2 justify-self-start">
          <Link to="/">Ir a Inbox</Link>
        </Button>
      </div>
    )
  }

  return <BoardView key={board.id} board={board} />
}

function BoardView({ board }: { board: BoardSummary }) {
  const detail = useQuery(boardQuery(board.id))

  useEffect(() => {
    writeLastBoard(board.slug)
  }, [board.slug])

  return (
    <div style={boardStyle(board.color)} className="flex h-full min-h-0 flex-col">
      <title>{`${board.name} – notnot.ion`}</title>
      <BoardHeader board={board} />
      {detail.isPending ? (
        <LanesSkeleton />
      ) : detail.isError ? (
        <ErrorState
          title="No se pudo cargar el tablero."
          message={detail.error.message}
          onRetry={() => void detail.refetch()}
        />
      ) : (
        <Lanes board={detail.data} />
      )}
    </div>
  )
}

function BoardHeader({ board }: { board: BoardSummary }) {
  const update = useUpdateBoard()
  const archived = board.archivedAt !== null

  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b px-4">
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-(--board)" />
      <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight">{board.name}</h1>
      {archived && (
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          Archivado
        </span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {archived && (
          <Button
            variant="outline"
            size="sm"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: board.id, archived: false })}
          >
            Desarchivar
          </Button>
        )}
        <BoardActionsMenu board={board} />
      </div>
    </header>
  )
}

function Lanes({ board }: { board: BoardDetail }) {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
      {board.columns.map((column) => {
        const tasks = board.tasks.filter((task) => task.columnId === column.id)
        return (
          <section
            key={column.id}
            aria-labelledby={`column-${column.id}`}
            className="flex max-h-full w-72 shrink-0 flex-col rounded-lg bg-lane"
          >
            <header className="flex h-10 shrink-0 items-center gap-2 px-3">
              <h2 id={`column-${column.id}`} className="text-[13px] font-medium">
                {column.name}
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">{tasks.length}</span>
            </header>
            <ol className="grid gap-1.5 overflow-y-auto px-2 pb-2">
              {tasks.map((task) => (
                <li key={task.id} className="rounded-md border bg-card px-3 py-2">
                  {task.title}
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

function LanesSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-4" aria-label="Cargando tablero">
      {[0, 1, 2].map((lane) => (
        <Skeleton key={lane} className="w-72 shrink-0 rounded-lg" />
      ))}
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 items-center border-b px-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <LanesSkeleton />
    </div>
  )
}
