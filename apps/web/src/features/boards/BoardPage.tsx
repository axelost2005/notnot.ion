import type { BoardSummary } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { PanelRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { KanbanBoard } from '../kanban/KanbanBoard'
import { NotesPanel } from '../notes/NotesPanel'
import { readPanelOpen, writePanelOpen } from '../notes/storage'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [notesOpen, setNotesOpen] = useState(readPanelOpen)
  // Un link a una nota (?nota=) abre el panel aunque estuviera plegado.
  const showNotes = notesOpen || searchParams.has('nota')

  function toggleNotes() {
    setNotesOpen(!showNotes)
    writePanelOpen(!showNotes)
    if (showNotes && searchParams.has('nota')) {
      setSearchParams(
        (params) => {
          params.delete('nota')
          return params
        },
        { replace: true },
      )
    }
  }

  useEffect(() => {
    writeLastBoard(board.slug)
  }, [board.slug])

  return (
    <div style={boardStyle(board.color)} className="flex h-full min-h-0 flex-col">
      <title>{`${board.name} – notnot.ion`}</title>
      <BoardHeader board={board} notesOpen={showNotes} onToggleNotes={toggleNotes} />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {detail.isPending ? (
            <LanesSkeleton />
          ) : detail.isError ? (
            <ErrorState
              title="No se pudo cargar el tablero."
              message={detail.error.message}
              onRetry={() => void detail.refetch()}
            />
          ) : (
            <KanbanBoard board={detail.data} />
          )}
        </div>
        {showNotes && (
          <NotesPanel board={board} className="hidden w-90 shrink-0 border-l md:flex" />
        )}
      </div>
    </div>
  )
}

type HeaderProps = {
  board: BoardSummary
  notesOpen: boolean
  onToggleNotes: () => void
}

function BoardHeader({ board, notesOpen, onToggleNotes }: HeaderProps) {
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
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={notesOpen}
          onClick={onToggleNotes}
          className="hidden gap-1.5 text-muted-foreground aria-pressed:text-foreground md:inline-flex"
        >
          <PanelRight />
          Notas
        </Button>
      </div>
    </header>
  )
}

function LanesSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-4" aria-label="Cargando tablero">
      {[0, 1, 2].map((lane) => (
        <Skeleton key={lane} className="w-68 shrink-0 rounded-lg" />
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
