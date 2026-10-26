import type { BoardSummary, Task } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { gsap } from 'gsap'
import { ChevronRight, History, LayoutGrid, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useOutlet } from 'react-router'
import { toast } from 'sonner'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { boardsQuery } from '../boards/api'
import { BoardFormDialog } from '../boards/BoardFormDialog'
import { boardStyle } from '../boards/colors'
import { today as getToday } from '../finance/format'
import { HistorySheet } from '../history/HistorySheet'
import { overviewQuery } from './api'
import { FROM_HOME, tileSelector } from './navigation'
import { Panel, PanelHeader } from './Panel'
import { capturedMessage } from './format'
import { QuickCapture } from './QuickCapture'
import { BoardTile, TileSkeletons } from './Tiles'

type Section = { tile: string; label: string }

/** El cuadrado del tablero abierto (`/b/:slug`). En Tareas, ninguno. */
function sectionOf(pathname: string, boards: BoardSummary[] | undefined): Section | null {
  const slug = /^\/b\/([^/]+)$/.exec(pathname)?.[1]
  if (slug === undefined) return null
  const board = boards?.find((b) => b.slug === decodeURIComponent(slug))
  return board ? { tile: `b:${board.id}`, label: board.name } : { tile: 'b:?', label: 'Tablero' }
}

/** El índice de esta entrada en el historial (React Router lo guarda en `history.state`). */
function historyIndex() {
  const state: unknown = window.history.state
  return typeof state === 'object' &&
    state !== null &&
    'idx' in state &&
    typeof state.idx === 'number'
    ? state.idx
    : 0
}

const isFromHome = (state: unknown) =>
  typeof state === 'object' && state !== null && 'fromHome' in state && state.fromHome === true

/**
 * `/`: Tareas (el campo para anotar y los cuadrados de los tableros) y, encima, el panel del
 * tablero abierto (`/b/:slug`).
 */
export function TasksHome() {
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const boards = useQuery(boardsQuery)
  const section = sectionOf(location.pathname, boards.data)
  // Dónde estaba el historial al abrir el panel desde la app (Tareas o Hoy): al cerrar se vuelve
  // ahí, así "atrás" no lo vuelve a abrir.
  const [opened, setOpened] = useState<{ index: number; fromHome: boolean } | null>(null)
  if (section && opened === null) {
    setOpened({ index: historyIndex(), fromHome: isFromHome(location.state) })
  }
  if (!section && opened !== null) setOpened(null)

  function onClosed() {
    const steps = opened ? historyIndex() - opened.index + 1 : 0
    if (opened?.fromHome && steps > 0) void navigate(-steps)
    else void navigate('/', { replace: true })
  }

  return (
    <>
      <TasksHeader />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <Home />
      </div>
      {section ? (
        <Panel tile={section.tile} label={section.label} onClosed={onClosed}>
          {outlet}
        </Panel>
      ) : (
        outlet
      )}
    </>
  )
}

function TasksHeader() {
  const [creating, setCreating] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <PanelHeader>
      <LayoutGrid aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <h1 className="text-[15px] font-semibold tracking-tight max-md:text-[17px]">Tareas</h1>
      <div className="ml-auto flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHistoryOpen(true)}
          className="gap-1.5 text-muted-foreground max-md:size-9 max-md:px-0"
        >
          <History />
          <span className="max-md:sr-only">Historial</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreating(true)}
          className="gap-1.5 text-muted-foreground max-md:size-9 max-md:px-0"
        >
          <Plus />
          <span className="max-md:sr-only">Nuevo tablero</span>
        </Button>
      </div>
      <BoardFormDialog open={creating} onOpenChange={setCreating} />
      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
    </PanelHeader>
  )
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** El cuadrado que recibió algo late una vez: se ve a dónde fue lo anotado. */
function pop(tile: string) {
  const el = document.querySelector(tileSelector(tile))
  if (!el || reducedMotion()) return
  gsap.fromTo(
    el,
    { scale: 0.95 },
    { scale: 1, duration: 0.45, ease: 'back.out(3)', clearProps: 'transform' },
  )
}

function Home() {
  const boards = useQuery(boardsQuery)
  const overview = useQuery(overviewQuery)
  const today = getToday()

  if (boards.isError || overview.isError) {
    const error = boards.error ?? overview.error
    return (
      <ErrorState
        title="No se pudieron cargar los tableros."
        message={error?.message ?? ''}
        onRetry={() => {
          void boards.refetch()
          void overview.refetch()
        }}
      />
    )
  }

  const active = boards.data?.filter((b) => b.archivedAt === null) ?? []
  // General al final: guarda lo que no es de ningún cliente.
  const ordered = [...active.filter((b) => !b.isGeneral), ...active.filter((b) => b.isGeneral)]
  const archived = boards.data?.filter((b) => b.archivedAt !== null) ?? []

  function onCreated(tasks: Task[]) {
    for (const boardId of new Set(tasks.map((task) => task.boardId))) pop(`b:${boardId}`)
    toast.success(capturedMessage(tasks, boards.data ?? [], today))
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-6 pt-5 pb-10 max-md:gap-3 max-md:px-3 max-md:pt-3">
      <title>notnot.ion</title>
      <QuickCapture forToday onCreated={onCreated} className="max-w-3xl" />
      <ul
        aria-label="Cuadrados"
        className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 max-md:grid-cols-2 max-md:gap-2.5"
      >
        {boards.data && overview.data ? (
          ordered.map((board) => (
            <BoardTile key={board.id} board={board} overview={overview.data} today={today} />
          ))
        ) : (
          <TileSkeletons count={6} />
        )}
      </ul>
      {archived.length > 0 && <ArchivedBoards boards={archived} />}
    </div>
  )
}

/** Los archivados no tienen cuadrado: van plegados abajo. */
function ArchivedBoards({ boards }: { boards: BoardSummary[] }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex h-8 items-center gap-1 rounded-md px-1 text-[13px] font-medium text-muted-foreground outline-none pointer-coarse:h-10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
        Archivados
        <span className="tabular-nums">({boards.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                to={`/b/${board.slug}`}
                state={FROM_HOME}
                style={boardStyle(board.color)}
                className="flex h-8 items-center gap-2 rounded-md border bg-card px-2.5 text-[13px] text-muted-foreground outline-none pointer-coarse:h-10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden="true" className="size-2 rounded-full bg-(--board)" />
                {board.name}
              </Link>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
