import type { BoardSummary, Payment } from '@notnot/shared'
import { groupByCategory, monthSchema, shiftMonth, totalsByCurrency } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight, Paperclip, Plus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { useLayout } from '@/app/layoutContext'
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
import { boardsQuery } from '../boards/api'
import { BoardChip } from '../boards/BoardChip'
import { paymentsQuery, paymentsSummaryQuery } from './api'
import { currentMonth, dayParts, formatMoney, monthLabel, monthName } from './format'
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
    <div className="flex h-full min-h-0 flex-col">
      <title>{`Finanzas, ${monthLabel(month).toLowerCase()} – notnot.ion`}</title>
      <FinanceHeader onNew={() => setOpen('new')} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-6 max-md:px-4 max-md:py-4">
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
                Anotá lo que te pagaron y adjuntá el comprobante: después sirve para mostrar qué se
                pagó y qué no.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen('new')}>
                <Plus />
                Anotar un pago
              </Button>
            </div>
          ) : (
            <>
              <Totals payments={payments.data} />
              {byCategory ? (
                groupByCategory(payments.data).map((group) => (
                  <section
                    key={group.category ?? ''}
                    aria-label={group.category ?? 'Sin categoría'}
                  >
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
        </div>
      </div>
      <PaymentDialog payment={openPayment} month={month} onClose={() => setOpen(null)} />
    </div>
  )
}

function FinanceHeader({ onNew }: { onNew: () => void }) {
  const { openBoardsMenu } = useLayout()

  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b px-4 max-md:pl-2">
      <Wallet aria-hidden="true" className="size-4 shrink-0 text-muted-foreground max-md:hidden" />
      <h1 className="text-[15px] font-semibold tracking-tight max-md:hidden">Finanzas</h1>
      {/* En el celu, el título abre el menú (tableros, notas y finanzas). */}
      <button
        type="button"
        onClick={openBoardsMenu}
        aria-haspopup="dialog"
        className="flex h-9 min-w-0 items-center gap-2 rounded-md px-2 text-[15px] font-semibold tracking-tight outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <Wallet aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        Finanzas
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">(abrir el menú)</span>
      </button>
      <Button size="sm" className="ml-auto" onClick={onNew}>
        <Plus />
        Anotar un pago
      </Button>
    </header>
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
            className="h-7 rounded-md px-2.5 text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent aria-pressed:font-medium aria-pressed:text-foreground"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Lo que entró en el mes, por moneda. */
function Totals({ payments }: { payments: Payment[] }) {
  return (
    <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-b pb-6">
      {totalsByCurrency(payments).map((total) => (
        <div key={total.currency} className="grid gap-1">
          <dt className="text-xs text-muted-foreground">
            Cobrado en {total.currency === 'ARS' ? 'pesos' : 'dólares'} · {total.count}{' '}
            {total.count === 1 ? 'pago' : 'pagos'}
          </dt>
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

function ListSkeleton() {
  return (
    <div className="mt-6 grid gap-4" aria-label="Cargando pagos">
      <Skeleton className="h-8 w-40" />
      {[72, 56, 64].map((width) => (
        <Skeleton key={width} className="h-10" style={{ width: `${width}%` }} />
      ))}
    </div>
  )
}
