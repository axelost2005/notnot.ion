import { dueCount } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { Columns3, Menu, NotebookPen, Wallet, type LucideIcon } from 'lucide-react'
import { Link, useMatch, useSearchParams } from 'react-router'
import { receivablesQuery } from '@/features/finance/api'
import { today } from '@/features/finance/format'

const ITEM_CLASS =
  'flex h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground outline-none focus-visible:bg-accent active:bg-accent/60 aria-[current=page]:font-medium aria-[current=page]:text-foreground'

type Props = {
  menuOpen: boolean
  onOpenMenu: () => void
}

/**
 * En el celu, la navegación va abajo, al alcance del pulgar: el tablero y sus notas, Finanzas y
 * el menú (los tableros, la sección Notas y bloquear).
 */
export function MobileNav({ menuOpen, onOpenMenu }: Props) {
  const slug = useMatch('/b/:slug')?.params.slug
  const onFinance = useMatch('/finanzas/*') !== null
  const [searchParams] = useSearchParams()
  const receivables = useQuery(receivablesQuery)
  // Lo por cobrar que vence hoy o ya venció, como en la sidebar.
  const due = dueCount(receivables.data ?? [], today())

  // Un link a una nota (?nota=) también es la vista Notas.
  const onNotes = searchParams.get('vista') === 'notas' || searchParams.has('nota')
  // Fuera de un tablero, `/` abre el último que se usó.
  const board = slug ? `/b/${slug}` : '/'

  return (
    <nav
      aria-label="Secciones"
      className="grid shrink-0 grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/* Entre la vista Tablero y Notas del mismo tablero no se suma historial. */}
      <NavItem to={board} replace={!!slug} current={!!slug && !onNotes} Icon={Columns3}>
        Tablero
      </NavItem>
      <NavItem
        to={`${board}?vista=notas`}
        replace={!!slug}
        current={!!slug && onNotes}
        Icon={NotebookPen}
      >
        Notas
      </NavItem>
      <NavItem to="/finanzas" current={onFinance} Icon={Wallet} badge={due}>
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
  /** Un número en rojo arriba del ícono. */
  badge?: number
  children: string
}

function NavItem({ to, replace, current, Icon, badge = 0, children }: NavItemProps) {
  return (
    <Link
      to={to}
      replace={replace}
      aria-current={current ? 'page' : undefined}
      className={ITEM_CLASS}
    >
      <span className="relative">
        <Icon aria-hidden="true" className="size-5" />
        {badge > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 left-3 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 font-semibold text-background tabular-nums"
          >
            {badge}
          </span>
        )}
      </span>
      {children}
      {badge > 0 && (
        <span className="sr-only">
          {badge === 1
            ? ' (1 por cobrar vence hoy o ya venció)'
            : ` (${badge} por cobrar vencen hoy o ya vencieron)`}
        </span>
      )}
    </Link>
  )
}
