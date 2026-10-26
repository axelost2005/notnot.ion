import type { BoardSummary, Task } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { History, PictureInPicture2 } from 'lucide-react'
import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { today as getToday } from '../finance/format'
import { HistorySheet } from '../history/HistorySheet'
import { PanelHeader } from '../home/Panel'
import { capturedMessage } from '../home/format'
import { QuickCapture } from '../home/QuickCapture'
import { KanbanBoard } from '../kanban/KanbanBoard'
import { LanesSkeleton } from '../kanban/LanesSkeleton'
import { NotesPanel } from '../notes/NotesPanel'
import { openNotesWindow } from '../notes/openNotesWindow'
import { boardQuery, boardsQuery, useUpdateBoard } from './api'
import { BoardActionsMenu } from './BoardActionsMenu'
import { boardStyle } from './colors'

/** `/b/:slug`: el panel de un tablero, encima del Inicio. */
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
      <>
        <PanelHeader>
          <h1 className="text-[15px] font-semibold tracking-tight">Tablero no encontrado</h1>
          <span className="ml-auto" />
        </PanelHeader>
        <div className="grid max-w-sm gap-1 p-6">
          <title>Tablero no encontrado – notnot.ion</title>
          <p className="font-medium">No hay ningún tablero en esta dirección.</p>
          <p className="text-[13px] text-muted-foreground">
            Puede que lo hayan renombrado o borrado.
          </p>
        </div>
      </>
    )
  }

  return <BoardView key={board.id} board={board} />
}

type Tab = 'tareas' | 'notas'

function BoardView({ board }: { board: BoardSummary }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const boards = useQuery(boardsQuery)
  // Un link a una nota (?nota=) o el atajo "Nueva nota" (?vista=notas) van directo a Notas.
  const tab: Tab =
    searchParams.get('vista') === 'notas' || searchParams.has('nota') ? 'notas' : 'tareas'

  function setTab(next: Tab) {
    setSearchParams(
      (params) => {
        params.delete('nota')
        params.delete('escribir')
        if (next === 'notas') params.set('vista', 'notas')
        else params.delete('vista')
        return params
      },
      { replace: true },
    )
  }

  // Si algo fue a otro tablero (con `@`), se avisa: acá no se ve.
  function onCreated(tasks: Task[]) {
    const elsewhere = tasks.filter((task) => task.boardId !== board.id)
    if (elsewhere.length) toast.success(capturedMessage(elsewhere, boards.data ?? [], getToday()))
  }

  return (
    <div style={boardStyle(board.color)} className="flex min-h-0 flex-1 flex-col">
      <title>{`${board.name} – notnot.ion`}</title>
      <BoardHeader board={board} tab={tab} onTab={setTab} />
      <div className="px-3 pt-2 md:hidden">
        <Tabs tab={tab} onTab={setTab} className="w-full" />
      </div>
      {tab === 'notas' ? (
        <NotesPanel
          board={board}
          autoFocus={searchParams.get('escribir') === '1'}
          className="mx-auto min-h-0 w-full max-w-3xl flex-1 bg-transparent"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <QuickCapture
            board={board}
            forToday={false}
            onCreated={onCreated}
            className="max-w-2xl px-4 pt-4 pb-3 max-md:px-3 max-md:pt-3"
          />
          <BoardKanban boardId={board.id} />
        </div>
      )}
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

/** Tareas o las notas del tablero (las que se vuelven tareas con `[]`). */
function Tabs({
  tab,
  onTab,
  className,
}: {
  tab: Tab
  onTab: (tab: Tab) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Sección del tablero"
      className={cn('inline-flex gap-0.5 rounded-lg border bg-card p-0.5', className)}
    >
      {(['tareas', 'notas'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={tab === value}
          onClick={() => onTab(value)}
          className="h-7 flex-1 rounded-md px-3 text-[13px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent aria-pressed:text-foreground pointer-coarse:h-9 pointer-coarse:text-sm"
        >
          {value === 'tareas' ? 'Tareas' : 'Notas'}
        </button>
      ))}
    </div>
  )
}

type HeaderProps = { board: BoardSummary; tab: Tab; onTab: (tab: Tab) => void }

function BoardHeader({ board, tab, onTab }: HeaderProps) {
  const update = useUpdateBoard()
  const [historyOpen, setHistoryOpen] = useState(false)
  const archived = board.archivedAt !== null

  return (
    <PanelHeader>
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-(--board)" />
      <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight max-md:text-[17px]">
        {board.name}
      </h1>
      {archived && (
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground max-md:hidden">
          Archivado
        </span>
      )}
      <Tabs tab={tab} onTab={onTab} className="ml-3 max-md:hidden" />
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
          className="gap-1.5 text-muted-foreground max-md:size-9 max-md:px-0"
        >
          <History />
          <span className="max-md:sr-only">Historial</span>
        </Button>
        <HistorySheet board={board} open={historyOpen} onOpenChange={setHistoryOpen} />
        <BoardActionsMenu board={board} />
        {/* En la compu: las notas solas en una ventana chica, para tener al costado. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Abrir las notas en otra ventana"
              onClick={() => openNotesWindow(board.slug)}
              className="text-muted-foreground max-md:hidden"
            >
              <PictureInPicture2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir las notas en otra ventana</TooltipContent>
        </Tooltip>
      </div>
    </PanelHeader>
  )
}

function BoardSkeleton() {
  return (
    <>
      <PanelHeader>
        <Skeleton className="h-4 w-40" />
        <span className="ml-auto" />
      </PanelHeader>
      <LanesSkeleton />
    </>
  )
}
