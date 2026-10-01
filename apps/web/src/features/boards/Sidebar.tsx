import type { BoardSummary } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Lock, Plus } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useLock } from '../lock/api'
import { InstallButton } from '../pwa/InstallButton'
import { boardsQuery } from './api'
import { BoardFormDialog } from './BoardFormDialog'
import { boardStyle } from './colors'

type Props = {
  /** Para cerrar el panel en mobile al elegir un tablero. */
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: Props) {
  const boards = useQuery(boardsQuery)
  const lock = useLock()
  const [creating, setCreating] = useState(false)

  const inbox = boards.data?.find((b) => b.isInbox)
  const active = boards.data?.filter((b) => !b.isInbox && b.archivedAt === null) ?? []
  const archived = boards.data?.filter((b) => !b.isInbox && b.archivedAt !== null) ?? []

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <BrandMark className="text-foreground" />
        <span className="text-[15px] font-semibold tracking-tight text-foreground">notnot.ion</span>
      </div>

      <nav aria-label="Tableros" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {boards.isPending ? (
          <div className="grid gap-2 px-2 pt-1" aria-label="Cargando tableros">
            {[64, 48, 56, 40].map((width) => (
              <Skeleton key={width} className="h-5" style={{ width: `${width}%` }} />
            ))}
          </div>
        ) : boards.isError ? (
          <div className="grid gap-2 px-2 pt-1 text-[13px]">
            <p className="text-muted-foreground">No se pudieron cargar los tableros.</p>
            <Button variant="outline" size="sm" onClick={() => void boards.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {inbox && (
              <ul className="grid gap-px">
                <BoardLink board={inbox} onNavigate={onNavigate} />
              </ul>
            )}

            <h2 className="mt-5 mb-1 px-2 text-xs font-medium text-muted-foreground">Tableros</h2>
            <ul className="grid gap-px">
              {active.map((board) => (
                <BoardLink key={board.id} board={board} onNavigate={onNavigate} />
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-3.5" />
                  Nuevo tablero
                </button>
              </li>
            </ul>

            {archived.length > 0 && (
              <Collapsible className="mt-5">
                <CollapsibleTrigger className="group flex h-7 w-full items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                  <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
                  Archivados
                  <span className="ml-auto tabular-nums">{archived.length}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-1 grid gap-px">
                    {archived.map((board) => (
                      <BoardLink key={board.id} board={board} onNavigate={onNavigate} />
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </nav>

      <div className="grid shrink-0 gap-px border-t border-sidebar-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <InstallButton />
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 px-2 text-muted-foreground"
          onClick={() => lock.mutate()}
          disabled={lock.isPending}
        >
          <Lock className="size-3.5" />
          Bloquear
        </Button>
      </div>

      <BoardFormDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}

function BoardLink({ board, onNavigate }: { board: BoardSummary; onNavigate?: () => void }) {
  return (
    <li>
      <NavLink
        to={`/b/${board.slug}`}
        onClick={onNavigate}
        style={boardStyle(board.color)}
        className={({ isActive }) =>
          cn(
            'relative flex h-8 items-center gap-2.5 rounded-md px-2 outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
            isActive &&
              'bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-(--board)',
          )
        }
      >
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--board)" />
        <span className="min-w-0 flex-1 truncate">{board.name}</span>
        {board.openTaskCount > 0 && (
          <span
            className="text-xs text-muted-foreground tabular-nums"
            aria-label={`${board.openTaskCount} abiertas`}
          >
            {board.openTaskCount}
          </span>
        )}
      </NavLink>
    </li>
  )
}
