import type { BoardSummary, Payment } from '@notnot/shared'
import {
  groupByCategory,
  monthSchema,
  remainingCents,
  shiftMonth,
  totalsByCurrency,
} from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Paperclip, Plus, Wallet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, Navigate, useMatch, useNavigate, useParams, useSearchParams } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { boardsQuery } from '../boards/api'
import { BoardChip } from '../boards/BoardChip'
import { paymentsQuery, paymentsSummaryQuery, receivablesQuery } from './api'
import { currencyName, currentMonth, dayParts, formatMoney, monthLabel, monthName } from './format'
import { PaymentDialog } from './PaymentDialog'

/** `/finanzas` abre el mes actual. */
export function FinanceRedirect() {
  return <Navigate to={`/finanzas/${currentMonth()}`} replace />
}

/** `/finanzas/2026-10`: los pagos que me hicieron ese mes. */
export function FinanceView() {
  const { month = '' } = useParams()
  if (!monthSchema.safeParse(month).success) return <FinanceRedirect />
  return <FinanceMonth month={month} />
}

function FinanceMonth({ month }: { month: string }) {
  const payments = useQuery(paymentsQuery(month))
  const boards = useQuery(boardsQuery)
  const [searchParams] = useSearchParams()
  const byCategory = searchParams.get('por') === 'categoria'
  // `'new'`: anotando uno; si no, el id del que se está viendo.
  const [open, setOpen] = useState<string | null>(null)
  const openPayment =
    open === 'new' ? 'new' : (payments.data?.find((payment) => payment.id === open) ?? null)
  const boardsById = new Map(boards.data?.map((board) => [board.id, board]))

  return (
    <FinanceFrame
      title={`Finanzas, ${monthLabel(month).toLowerCase()} – notnot.ion`}
      action={
        <Button size="sm" onClick={() => setOpen('new')}>
          <Plus />
          Anotar un pago
        </Button>
      }
    >
      <MonthBar month={month} byCategory={byCategory} />
      {payments.isPending ? (
        <ListSkeleton />
      ) : payments.isError ? (
        <ErrorState
          title="No se pudieron cargar los pagos."
          message={payments.error.message}
          onRetry={() => void payments.refetch()}
        />
      ) : payments.data.length === 0 ? (
        <div className="mt-10">
          <p className="font-medium">No hay pagos anotados en {monthName(month)}.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Anotá lo que te pagaron y adjuntá el comprobante: después sirve para mostrar qué se pagó
            y qué no.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen('new')}>
            <Plus />
            Anotar un pago
          </Button>
        </div>
      ) : (
        <>
          <Totals
            className="mt-6"
            totals={totalsByCurrency(payments.data)}
            label={(total) =>
              `Cobrado en ${currencyName(total.currency)} · ${total.count} ${total.count === 1 ? 'pago' : 'pagos'}`
            }
          />
          {byCategory ? (
            groupByCategory(payments.data).map((group) => (
              <section key={group.category ?? ''} aria-label={group.category ?? 'Sin categoría'}>
                <header className="mt-6 flex items-baseline justify-between gap-3 border-b pb-2">
                  <h2 className="truncate text-sm font-semibold">
                    {group.category ?? 'Sin categoría'}
                  </h2>
                  <p className="shrink-0 text-[13px] text-muted-foreground tabular-nums">
                    {group.totals
                      .map((total) => formatMoney(total.totalCents, total.currency))
                      .join(' · ')}
                  </p>
                </header>
                <PaymentList
                  payments={group.payments}
                  boardsById={boardsById}
                  showCategory={false}
                  onOpen={setOpen}
                />
              </section>
            ))
          ) : (
            <PaymentList
              payments={payments.data}
              boardsById={boardsById}
              showCategory
              onOpen={setOpen}
            />
          )}
        </>
      )}
      <PaymentDialog payment={openPayment} month={month} onClose={() => setOpen(null)} />
    </FinanceFrame>
  )
}

/** Lo que comparten Cobrado y Por cobrar: el header con su botón y las pestañas. */
export function FinanceFrame({
  title,
  action,
  children,
}: {
  title: string
  action: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <title>{title}</title>
      <FinanceHeader action={action} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-6 max-md:px-4 max-md:py-4">
          <FinanceTabs />
          {children}
        </div>
      </div>
    </div>
  )
}

function FinanceHeader({ action }: { action: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b px-4">
      <Wallet aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <h1 className="text-[15px] font-semibold tracking-tight max-md:text-[17px]">Finanzas</h1>
      <div className="ml-auto">{action}</div>
    </header>
  )
}

/** Cobrado (los pagos por mes) y Por cobrar (con cuántas hay pendientes). */
function FinanceTabs() {
  const receivables = useQuery(receivablesQuery)
  const onReceivables = useMatch('/finanzas/por-cobrar') !== null
  const pending = receivables.data?.filter((r) => remainingCents(r) > 0).length ?? 0
  const tabs = [
    { to: '/finanzas', label: 'Cobrado', active: !onReceivables, count: 0 },
    { to: '/finanzas/por-cobrar', label: 'Por cobrar', active: onReceivables, count: pending },
  ]

  return (
    <nav aria-label="Secciones de Finanzas" className="mb-6 flex gap-6 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          aria-current={tab.active ? 'page' : undefined}
          className="-mb-px flex h-9 items-center gap-1.5 rounded-t-sm border-b-2 border-transparent text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:border-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
        >
          {tab.label}
          {tab.count > 0 && (
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {tab.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

function MonthBar({ month, byCategory }: { month: string; byCategory: boolean }) {
  const summary = useQuery(paymentsSummaryQuery)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  // Los meses con pagos, más el actual y el que se está viendo.
  const counts = new Map(summary.data?.months.map((m) => [m.month, m.count]))
  const months = [...new Set([...counts.keys(), currentMonth(), month])].sort((a, b) =>
    b.localeCompare(a),
  )

  function view(categories: boolean) {
    setSearchParams(
      (params) => {
        if (categories) params.set('por', 'categoria')
        else params.delete('por')
        return params
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Mes anterior">
          <Link to={`/finanzas/${shiftMonth(month, -1)}${search}`}>
            <ChevronLeft />
          </Link>
        </Button>
        <Select value={month} onValueChange={(next) => void navigate(`/finanzas/${next}${search}`)}>
          <SelectTrigger
            aria-label="Mes"
            className="h-8 min-w-0 border-transparent px-2 text-[17px] font-semibold tracking-tight dark:bg-transparent"
          >
            <SelectValue>{monthLabel(month)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map((option) => (
              <SelectItem key={option} value={option}>
                {monthLabel(option)}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {counts.get(option) ?? 0}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant="ghost" size="icon-sm" aria-label="Mes siguiente">
          <Link to={`/finanzas/${shiftMonth(month, 1)}${search}`}>
            <ChevronRight />
          </Link>
        </Button>
      </div>
      <div role="group" aria-label="Ver los pagos" className="flex rounded-lg border p-0.5">
        {[
          { label: 'Por fecha', active: !byCategory, categories: false },
          { label: 'Por categoría', active: byCategory, categories: true },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={option.active}
            onClick={() => view(option.categories)}
            className="h-7 rounded-md px-2.5 text-[13px] text-muted-foreground outline-none pointer-coarse:h-9 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent aria-pressed:font-medium aria-pressed:text-foreground"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

type CurrencyTotal = ReturnType<typeof totalsByCurrency>[number]

/** Un total grande por moneda: lo cobrado en el mes o lo que te deben. */
export function Totals({
  totals,
  label,
  className,
}: {
  totals: CurrencyTotal[]
  label: (total: CurrencyTotal) => string
  className?: string
}) {
  return (
    <dl className={cn('flex flex-wrap gap-x-10 gap-y-4 border-b pb-6', className)}>
      {totals.map((total) => (
        <div key={total.currency} className="grid gap-1">
          <dt className="text-xs text-muted-foreground">{label(total)}</dt>
          <dd className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-none font-semibold tracking-tight tabular-nums">
            {formatMoney(total.totalCents, total.currency)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function PaymentList({
  payments,
  boardsById,
  showCategory,
  onOpen,
}: {
  payments: Payment[]
  boardsById: Map<string, BoardSummary>
  showCategory: boolean
  onOpen: (id: string) => void
}) {
  return (
    <ul className="divide-y">
      {payments.map((payment) => {
        const { day, weekday } = dayParts(payment.date)
        const board = payment.boardId ? boardsById.get(payment.boardId) : undefined
        const title = payment.description ?? payment.category ?? 'Pago'
        const category = showCategory && payment.description ? payment.category : null
        return (
          <li key={payment.id}>
            <button
              type="button"
              onClick={() => onOpen(payment.id)}
              className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-3 text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid justify-items-center leading-none">
                <span className="text-lg font-semibold tabular-nums">{day}</span>
                <span className="mt-1 text-[11px] text-muted-foreground uppercase">{weekday}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{title}</span>
                {(board || category || payment.images.length > 0) && (
                  <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    {board && <BoardChip board={board} className="-ml-0.5" />}
                    {category && <span className="truncate">{category}</span>}
                    {payment.images.length > 0 && (
                      <span className="flex shrink-0 items-center gap-0.5">
                        <Paperclip aria-hidden="true" className="size-3" />
                        {payment.images.length}
                        <span className="sr-only">
                          {payment.images.length === 1 ? ' comprobante' : ' comprobantes'}
                        </span>
                      </span>
                    )}
                  </span>
                )}
              </span>
              <span className="text-right font-semibold whitespace-nowrap tabular-nums">
                {formatMoney(payment.amountCents, payment.currency)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function ListSkeleton({ label = 'Cargando pagos' }: { label?: string }) {
  return (
    <div className="mt-6 grid gap-4" aria-label={label}>
      <Skeleton className="h-8 w-40" />
      {[72, 56, 64].map((width) => (
        <Skeleton key={width} className="h-10" style={{ width: `${width}%` }} />
      ))}
    </div>
  )
}
