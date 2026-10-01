import type { BoardSummary } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  Columns3,
  History,
  NotebookPen,
  PanelRight,
  PictureInPicture2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useLayout } from '@/app/layoutContext'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { GeneralBoard } from '../general/GeneralBoard'
import { HistorySheet } from '../history/HistorySheet'
import { KanbanBoard } from '../kanban/KanbanBoard'
import { LanesSkeleton } from '../kanban/LanesSkeleton'
import { NotesPanel } from '../notes/NotesPanel'
import { openNotesWindow } from '../notes/openNotesWindow'
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
          <Link to="/">Ir a General</Link>
        </Button>
      </div>
    )
  }

  return <BoardView key={board.id} board={board} />
}

type Tab = 'tablero' | 'notas'

function BoardView({ board }: { board: BoardSummary }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notesOpen, setNotesOpen] = useState(readPanelOpen)

  // En mobile se ve una cosa por vez. Un link a una nota (?nota=) va directo a Notas.
  const tab: Tab =
    searchParams.get('vista') === 'notas' || searchParams.has('nota') ? 'notas' : 'tablero'
  // En desktop el panel va al costado; esos mismos links lo abren aunque estuviera plegado.
  const panelOpen = notesOpen || tab === 'notas'

  function updateParams(change: (params: URLSearchParams) => void) {
    setSearchParams(
      (params) => {
        change(params)
        return params
      },
      { replace: true },
    )
  }

  function toggleNotes() {
    setNotesOpen(!panelOpen)
    writePanelOpen(!panelOpen)
    if (panelOpen) {
      updateParams((params) => {
        params.delete('vista')
        params.delete('nota')
      })
    }
  }

  function selectTab(next: Tab) {
    updateParams((params) => {
      params.delete('nota')
      params.delete('escribir')
      if (next === 'notas') params.set('vista', 'notas')
      else params.delete('vista')
    })
  }

  useEffect(() => {
    writeLastBoard(board.slug)
  }, [board.slug])

  return (
    <div style={boardStyle(board.color)} className="flex h-full min-h-0 flex-col">
      <title>{`${board.name} – notnot.ion`}</title>
      <BoardHeader board={board} notesOpen={panelOpen} onToggleNotes={toggleNotes} />
      <div className="flex min-h-0 flex-1">
        <div
          id="vista-tablero"
          className={cn('flex min-w-0 flex-1 flex-col', tab === 'notas' && 'max-md:hidden')}
        >
          {board.isGeneral ? <GeneralBoard board={board} /> : <BoardKanban boardId={board.id} />}
        </div>
        {panelOpen && (
          <NotesPanel
            board={board}
            autoFocus={searchParams.get('escribir') === '1'}
            className={cn(
              'w-full md:w-90 md:shrink-0 md:border-l',
              tab !== 'notas' && 'max-md:hidden',
              !panelOpen && 'md:hidden',
            )}
          />
        )}
      </div>
      <MobileTabs tab={tab} onSelect={selectTab} />
    </div>
  )
}

function BoardKanban({ boardId }: { boardId: string }) {
  const detail = useQuery(boardQuery(boardId))

  if (detail.isPending) return <LanesSkeleton />
  if (detail.isError) {
    return (
      <ErrorState
        title="No se pudo cargar el tablero."
        message={detail.error.message}
        onRetry={() => void detail.refetch()}
      />
    )
  }
  return <KanbanBoard board={detail.data} />
}

type HeaderProps = {
  board: BoardSummary
  notesOpen: boolean
  onToggleNotes: () => void
}

function BoardHeader({ board, notesOpen, onToggleNotes }: HeaderProps) {
  const update = useUpdateBoard()
  const { openBoardsMenu } = useLayout()
  const [historyOpen, setHistoryOpen] = useState(false)
  const archived = board.archivedAt !== null

  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b px-4 max-md:pl-2">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full bg-(--board) max-md:hidden"
      />
      <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight max-md:hidden">
        {board.name}
      </h1>
      {/* En mobile, el título es el selector de tablero. */}
      <h1 className="min-w-0 md:hidden">
        <button
          type="button"
          onClick={openBoardsMenu}
          aria-haspopup="dialog"
          className="flex h-9 max-w-full min-w-0 items-center gap-2 rounded-md px-2 text-[15px] font-semibold tracking-tight outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-(--board)" />
          <span className="truncate">{board.name}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">(cambiar de tablero)</span>
        </button>
      </h1>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHistoryOpen(true)}
          className="gap-1.5 text-muted-foreground"
        >
          <History />
          <span className="max-md:sr-only">Historial</span>
        </Button>
        {/* En General, el historial de todos los tableros. */}
        <HistorySheet
          board={board.isGeneral ? undefined : board}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
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
        {/* En la compu: las notas solas en una ventana chica, para tener al costado. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Abrir las notas en otra ventana"
              onClick={() => openNotesWindow(board.slug)}
              className="hidden text-muted-foreground md:inline-flex"
            >
              <PictureInPicture2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir las notas en otra ventana</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}

function MobileTabs({ tab, onSelect }: { tab: Tab; onSelect: (tab: Tab) => void }) {
  const tabs = [
    { id: 'tablero', label: 'Tablero', Icon: Columns3 },
    { id: 'notas', label: 'Notas', Icon: NotebookPen },
  ] as const

  return (
    <div
      role="tablist"
      aria-label="Vista"
      className="grid shrink-0 grid-cols-2 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          aria-controls={id === 'tablero' ? 'vista-tablero' : undefined}
          onClick={() => onSelect(id)}
          className="flex h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground outline-none focus-visible:bg-accent aria-selected:text-foreground"
        >
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </button>
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
