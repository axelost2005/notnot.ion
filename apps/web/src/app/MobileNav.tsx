import { dueCount, pendingTodayCount } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { Columns3, ListChecks, Menu, NotebookText, Wallet, type LucideIcon } from 'lucide-react'
import { Link, useMatch } from 'react-router'
import { receivablesQuery } from '@/features/finance/api'
import { today } from '@/features/finance/format'
import { dayItemsQuery } from '@/features/today/api'
import { cn } from '@/lib/utils'

const ITEM_CLASS =
  'flex h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground outline-none focus-visible:bg-accent active:bg-accent/60 aria-[current=page]:font-medium aria-[current=page]:text-foreground'

type Props = {
  menuOpen: boolean
  onOpenMenu: () => void
}

/**
 * En el celu, la navegación va abajo, al alcance del pulgar: Hoy, el tablero, la sección Notas
 * (para anotar rápido), Finanzas y el menú (los tableros, el árbol de notas y bloquear). Las notas
 * de cada tablero se abren desde su header.
 */
export function MobileNav({ menuOpen, onOpenMenu }: Props) {
  const slug = useMatch('/b/:slug')?.params.slug
  const onNotes = useMatch('/p/*') !== null
  const onFinance = useMatch('/finanzas/*') !== null
  const onToday = useMatch('/hoy') !== null
  const receivables = useQuery(receivablesQuery)
  const dayItems = useQuery(dayItemsQuery)
  // Lo por cobrar que vence hoy o ya venció y lo que queda para hoy, como en la sidebar.
  const due = dueCount(receivables.data ?? [], today())
  const leftToday = pendingTodayCount(dayItems.data ?? [], today())

  return (
    <nav
      aria-label="Secciones"
      className="grid shrink-0 grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <NavItem
        to="/hoy"
        current={onToday}
        Icon={ListChecks}
        badge={{ count: leftToday, label: `${leftToday} para hoy` }}
      >
        Hoy
      </NavItem>
      {/* En un tablero vuelve a sus columnas sin sumar historial; fuera, `/` abre el último. */}
      <NavItem to={slug ? `/b/${slug}` : '/'} replace={!!slug} current={!!slug} Icon={Columns3}>
        Tablero
      </NavItem>
      <NavItem to="/p" current={onNotes} Icon={NotebookText}>
        Notas
      </NavItem>
      <NavItem
        to="/finanzas"
        current={onFinance}
        Icon={Wallet}
        badge={{
          count: due,
          label:
            due === 1
              ? '1 por cobrar vence hoy o ya venció'
              : `${due} por cobrar vencen hoy o ya vencieron`,
          alert: true,
        }}
      >
        Finanzas
      </NavItem>
      <button
        type="button"
        onClick={onOpenMenu}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        className={ITEM_CLASS}
      >
        <Menu aria-hidden="true" className="size-5" />
        Menú
      </button>
    </nav>
  )
}

type NavItemProps = {
  to: string
  replace?: boolean
  current: boolean
  Icon: LucideIcon
  /** Un número arriba del ícono (en rojo si es un aviso) y qué significa, para lectores de pantalla. */
  badge?: { count: number; label: string; alert?: boolean }
  children: string
}

function NavItem({ to, replace, current, Icon, badge, children }: NavItemProps) {
  const count = badge?.count ?? 0
  return (
    <Link
      to={to}
      replace={replace}
      aria-current={current ? 'page' : undefined}
      className={ITEM_CLASS}
    >
      <span className="relative">
        <Icon aria-hidden="true" className="size-5" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute -top-1.5 left-3 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold text-background tabular-nums',
              badge?.alert ? 'bg-destructive' : 'bg-foreground',
            )}
          >
            {count}
          </span>
        )}
      </span>
      {children}
      {count > 0 && <span className="sr-only"> ({badge?.label})</span>}
    </Link>
  )
}
