import { dueCount, pendingTodayCount } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { LayoutGrid, Lock, Sun, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useMatch } from 'react-router'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { boardsQuery } from '@/features/boards/api'
import { receivablesQuery } from '@/features/finance/api'
import { today as getToday } from '@/features/finance/format'
import { overviewQuery } from '@/features/home/api'
import { useLock } from '@/features/lock/api'
import { NotesSection } from '@/features/pages/NotesSection'
import { InstallButton } from '@/features/pwa/InstallButton'
import { cn } from '@/lib/utils'

const ICON_CLASS = 'size-3.5 shrink-0 text-muted-foreground'

type Props = {
  /** En el celu la barra es una hoja: elegir algo la cierra. */
  onNavigate?: () => void
}

/** La barra: Hoy, Tareas y Finanzas arriba (un árbol largo de Notas no los empuja) y Notas. */
export function Sidebar({ onNavigate }: Props) {
  const boards = useQuery(boardsQuery)
  const overview = useQuery(overviewQuery)
  const receivables = useQuery(receivablesQuery)
  const lock = useLock()
  const today = getToday()
  const todayMatch = useMatch('/hoy')
  const tasksMatch = useMatch('/')
  // Tareas sigue marcada con el panel de un tablero abierto encima.
  const boardMatch = useMatch('/b/:slug')
  const financeMatch = useMatch({ path: '/finanzas', end: false })

  const leftToday = pendingTodayCount(overview.data?.tasks ?? [], today)
  const open = (boards.data ?? [])
    .filter((b) => b.archivedAt === null)
    .reduce((sum, b) => sum + b.openTaskCount, 0)
  // Lo por cobrar que vence hoy o ya venció: para no olvidarse de reclamarlo.
  const due = dueCount(receivables.data ?? [], today)

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-12 shrink-0 items-center px-2">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex h-8 items-center gap-2 rounded-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark className="text-foreground" />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            notnot.ion
          </span>
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <nav aria-label="Secciones" className="grid gap-px">
          <SectionLink
            to="/hoy"
            active={todayMatch !== null}
            icon={<Sun aria-hidden="true" className="size-3.5 shrink-0 text-sun-ink" />}
            label="Hoy"
            count={leftToday}
            countLabel="para hoy"
            onNavigate={onNavigate}
          />
          <SectionLink
            to="/"
            active={tasksMatch !== null || boardMatch !== null}
            icon={<LayoutGrid aria-hidden="true" className={ICON_CLASS} />}
            label="Tareas"
            count={open}
            countLabel={open === 1 ? 'abierta' : 'abiertas'}
            onNavigate={onNavigate}
          />
          <SectionLink
            to="/finanzas"
            active={financeMatch !== null}
            icon={<Wallet aria-hidden="true" className={ICON_CLASS} />}
            label="Finanzas"
            count={due}
            countLabel={
              due === 1
                ? 'por cobrar vence hoy o ya venció'
                : 'por cobrar vencen hoy o ya vencieron'
            }
            countClassName="font-medium text-destructive"
            onNavigate={onNavigate}
          />
        </nav>
        <NotesSection onNavigate={onNavigate} />
      </div>

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
    </div>
  )
}

type SectionLinkProps = {
  to: string
  active: boolean
  icon: ReactNode
  label: string
  count: number
  /** Lo que lee un lector de pantalla después del número: "Hoy, 3 para hoy". */
  countLabel: string
  countClassName?: string
  onNavigate?: () => void
}

function SectionLink({
  to,
  active,
  icon,
  label,
  count,
  countLabel,
  countClassName,
  onNavigate,
}: SectionLinkProps) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-label={count > 0 ? `${label}, ${count} ${countLabel}` : label}
      className={cn(
        'flex h-8 items-center gap-2.5 rounded-md px-2 outline-none pointer-coarse:h-11 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && (
        <span
          aria-hidden="true"
          className={cn('text-xs text-muted-foreground tabular-nums', countClassName)}
        >
          {count}
        </span>
      )}
    </Link>
  )
}
