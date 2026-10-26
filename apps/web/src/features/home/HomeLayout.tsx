import type { BoardSummary, Task } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { gsap } from 'gsap'
import { ChevronRight, History, Lock, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useOutlet } from 'react-router'
import { toast } from 'sonner'
import { BrandMark } from '@/components/BrandMark'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { boardsQuery } from '../boards/api'
import { BoardFormDialog } from '../boards/BoardFormDialog'
import { boardStyle } from '../boards/colors'
import { receivablesQuery } from '../finance/api'
import { today as getToday } from '../finance/format'
import { HistorySheet } from '../history/HistorySheet'
import { useLock } from '../lock/api'
import { pagesTreeQuery } from '../pages/api'
import { InstallButton } from '../pwa/InstallButton'
import { OfflineBanner } from '../pwa/OfflineBanner'
import { overviewQuery } from './api'
import { FROM_HOME, tileSelector } from './navigation'
import { Panel } from './Panel'
import { capturedMessage } from './format'
import { QuickCapture } from './QuickCapture'
import { BoardTile, FinanceTile, NotesTile, TileSkeletons, TodayTile } from './Tiles'

type Section = { tile: string; label: string }

/** Qué cuadrado corresponde a la ruta abierta. En el Inicio, ninguno. */
function sectionOf(pathname: string, boards: BoardSummary[] | undefined): Section | null {
  if (pathname === '/hoy') return { tile: 'hoy', label: 'Hoy' }
  if (pathname === '/p' || pathname.startsWith('/p/')) return { tile: 'notas', label: 'Notas' }
  if (pathname.startsWith('/finanzas')) return { tile: 'finanzas', label: 'Finanzas' }
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
 * La app: el Inicio (el campo para anotar y los cuadrados) y, encima, el panel de lo que esté
 * abierto (`/b/:slug`, `/hoy`, `/p`, `/finanzas`…).
 */
export function HomeLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const boards = useQuery(boardsQuery)
  const section = sectionOf(location.pathname, boards.data)
  // Dónde estaba el historial al abrir el panel desde el Inicio: al cerrar se vuelve ahí, así
  // "atrás" no lo vuelve a abrir.
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
    <div className="flex h-dvh flex-col overflow-hidden">
      <OfflineBanner />
      <TopBar />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <Home />
      </main>
      {section ? (
        <Panel tile={section.tile} label={section.label} onClosed={onClosed}>
          {outlet}
        </Panel>
      ) : (
        outlet
      )}
    </div>
  )
}

function TopBar() {
  const lock = useLock()
  const [creating, setCreating] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 max-md:h-14 max-md:pr-2 max-md:pl-4">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandMark className="text-foreground" />
        <span className="text-[15px] font-semibold tracking-tight">notnot.ion</span>
      </Link>
      <div className="ml-auto flex items-center gap-0.5">
        <InstallButton className="text-muted-foreground" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreating(true)}
          className="gap-1.5 text-muted-foreground max-md:size-9 max-md:px-0"
        >
          <Plus />
          <span className="max-md:sr-only">Nuevo tablero</span>
        </Button>
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
          size="icon"
          aria-label="Bloquear"
          title="Bloquear"
          disabled={lock.isPending}
          onClick={() => lock.mutate()}
          className="text-muted-foreground"
        >
          <Lock />
        </Button>
      </div>
      <BoardFormDialog open={creating} onOpenChange={setCreating} />
      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
    </header>
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
  const tree = useQuery(pagesTreeQuery)
  const receivables = useQuery(receivablesQuery)
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
    if (tasks.some((task) => task.day !== null && task.day <= today)) pop('hoy')
    toast.success(capturedMessage(tasks, boards.data ?? [], today))
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-6 pt-5 pb-10 max-md:gap-3 max-md:px-3 max-md:pt-3">
      <title>notnot.ion</title>
      <h1 className="sr-only">Inicio</h1>
      <QuickCapture forToday onCreated={onCreated} className="max-w-3xl" />
      <ul
        aria-label="Cuadrados"
        className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 max-md:grid-cols-2 max-md:gap-2.5"
      >
        {boards.data && overview.data ? (
          <>
            <TodayTile overview={overview.data} boards={boards.data} today={today} />
            {ordered.map((board) => (
              <BoardTile key={board.id} board={board} overview={overview.data} today={today} />
            ))}
            {tree.data && <NotesTile tree={tree.data} />}
            {receivables.data && (
              <FinanceTile receivables={receivables.data} boards={boards.data} today={today} />
            )}
          </>
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
