import type { BoardSummary, Receivable } from '@notnot/shared'
import { groupReceivables, remainingCents, settledOn, totalsByCurrency } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, HandCoins, Plus } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { boardsQuery } from '../boards/api'
import { BoardChip } from '../boards/BoardChip'
import { receivablesQuery } from './api'
import { FinanceFrame, ListSkeleton, Totals } from './FinanceView'
import { currencyName, currentMonth, dayParts, dueLabel, formatMoney, today } from './format'
import { PaymentDialog } from './PaymentDialog'
import { ReceivableDialog } from './ReceivableDialog'

/** `/finanzas/por-cobrar`: lo que te deben, lo vencido primero. */
export function ReceivablesView() {
  const receivables = useQuery(receivablesQuery)
  const boards = useQuery(boardsQuery)
  // `'new'`: anotando una; si no, el id de la que se está viendo.
  const [open, setOpen] = useState<string | null>(null)
  // "Me pagaron": el pago nuevo de esta.
  const [paying, setPaying] = useState<Receivable | null>(null)
  const openReceivable =
    open === 'new' ? 'new' : (receivables.data?.find((r) => r.id === open) ?? null)
  const boardsById = new Map(boards.data?.map((board) => [board.id, board]))

  return (
    <FinanceFrame
      title="Por cobrar – notnot.ion"
      action={
        <Button size="sm" onClick={() => setOpen('new')}>
          <Plus />
          Anotar lo que te deben
        </Button>
      }
    >
      {receivables.isPending ? (
        <ListSkeleton label="Cargando lo que te deben" />
      ) : receivables.isError ? (
        <ErrorState
          title="No se pudo cargar lo que te deben."
          message={receivables.error.message}
          onRetry={() => void receivables.refetch()}
        />
      ) : (
        <ReceivableGroups
          receivables={receivables.data}
          boardsById={boardsById}
          onNew={() => setOpen('new')}
          onOpen={setOpen}
          onPay={setPaying}
        />
      )}
      <ReceivableDialog receivable={openReceivable} onClose={() => setOpen(null)} />
      <PaymentDialog
        payment={paying ? 'new' : null}
        receivable={paying ?? undefined}
        month={currentMonth()}
        onClose={() => setPaying(null)}
      />
    </FinanceFrame>
  )
}

type RowActions = {
  onOpen: (id: string) => void
  onPay: (receivable: Receivable) => void
}

function ReceivableGroups({
  receivables,
  boardsById,
  onNew,
  ...actions
}: RowActions & {
  receivables: Receivable[]
  boardsById: Map<string, BoardSummary>
  onNew: () => void
}) {
  const now = today()
  const groups = groupReceivables(receivables, now)
  const pending = [...groups.overdue, ...groups.upcoming, ...groups.undated]
  const totals = totalsByCurrency(
    pending.map((r) => ({ amountCents: remainingCents(r), currency: r.currency })),
  )
  const sections = [
    { label: 'Vencidas', items: groups.overdue },
    { label: 'Por vencer', items: groups.upcoming },
    { label: 'Sin fecha', items: groups.undated },
  ].filter((section) => section.items.length > 0)
  const row = (receivable: Receivable) => (
    <ReceivableRow
      key={receivable.id}
      receivable={receivable}
      board={receivable.boardId ? boardsById.get(receivable.boardId) : undefined}
      today={now}
      {...actions}
    />
  )

  return (
    <>
      {pending.length === 0 ? (
        <div className="mt-4">
          <p className="font-medium">No te deben nada.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Anotá lo que te deben y para cuándo: lo vencido queda arriba, marcado, y en el menú ves
            cuánto vence hoy.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onNew}>
            <Plus />
            Anotar lo que te deben
          </Button>
        </div>
      ) : (
        <Totals
          totals={totals}
          label={(total) =>
            `Te deben en ${currencyName(total.currency)} · ${total.count} ${total.count === 1 ? 'pendiente' : 'pendientes'}`
          }
        />
      )}

      {sections.map((section) => (
        <section key={section.label} aria-label={section.label}>
          <h2
            className={cn(
              'mt-6 border-b pb-2 text-sm font-semibold',
              section.label === 'Vencidas' && 'text-destructive',
            )}
          >
            {section.label}
          </h2>
          <ul className="divide-y">{section.items.map(row)}</ul>
        </section>
      ))}

      {groups.settled.length > 0 && (
        <Collapsible className="mt-8">
          <CollapsibleTrigger className="group flex h-8 items-center gap-1 rounded-md pr-2 text-sm font-semibold outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
            />
            Cobradas
            <span className="ml-1 font-normal text-muted-foreground tabular-nums">
              {groups.settled.length}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-1 divide-y border-t">{groups.settled.map(row)}</ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  )
}

function ReceivableRow({
  receivable,
  board,
  today,
  onOpen,
  onPay,
}: RowActions & {
  receivable: Receivable
  board: BoardSummary | undefined
  today: string
}) {
  const remaining = remainingCents(receivable)
  const settled = remaining === 0
  // Las pendientes muestran el día que vencen; las cobradas, el día que se terminaron de cobrar.
  const day = settled ? settledOn(receivable) : receivable.dueDate
  const parts = day ? dayParts(day) : null
  const overdue = !settled && receivable.dueDate !== null && receivable.dueDate < today
  const payments = receivable.payments.length

  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onOpen(receivable.id)}
        // En el celu, el monto baja a una línea propia: el concepto y el vencimiento tienen todo el ancho.
        className="grid min-w-0 flex-1 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-md px-2 py-3 text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring max-sm:grid-cols-[2.5rem_minmax(0,1fr)] max-sm:items-start"
      >
        <span
          className={cn(
            'grid justify-items-center leading-none max-sm:row-span-2 max-sm:pt-0.5',
            overdue && 'text-destructive',
          )}
        >
          {parts ? (
            <>
              <span className="text-lg font-semibold tabular-nums">{parts.day}</span>
              <span
                className={cn(
                  'mt-1 text-[11px] uppercase',
                  overdue ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {parts.month}
              </span>
            </>
          ) : (
            <span aria-hidden="true" className="text-muted-foreground">
              –
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{receivable.description}</span>
          {(board || settled || receivable.dueDate) && (
            <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              {settled ? (
                <span className="shrink-0">
                  {payments} {payments === 1 ? 'pago' : 'pagos'}
                </span>
              ) : (
                receivable.dueDate && (
                  <span
                    className={cn(
                      'shrink-0',
                      overdue && 'font-medium text-destructive',
                      receivable.dueDate === today && 'font-medium text-foreground',
                    )}
                  >
                    {dueLabel(receivable.dueDate, today)}
                  </span>
                )
              )}
              {/* El cliente cede lugar antes que el vencimiento. */}
              {board && <BoardChip board={board} className="min-w-0 shrink" />}
            </span>
          )}
        </span>
        <span className="grid justify-items-end text-right max-sm:col-start-2 max-sm:mt-1.5 max-sm:flex max-sm:items-baseline max-sm:gap-1.5 max-sm:text-left">
          <span
            className={cn(
              'font-semibold whitespace-nowrap tabular-nums',
              settled && 'text-muted-foreground',
            )}
          >
            {formatMoney(settled ? receivable.paidCents : remaining, receivable.currency)}
          </span>
          {!settled && receivable.paidCents > 0 && (
            <span className="mt-1 text-xs whitespace-nowrap text-muted-foreground tabular-nums max-sm:mt-0">
              de {formatMoney(receivable.amountCents, receivable.currency)}
            </span>
          )}
        </span>
      </button>
      {!settled && (
        <Button
          variant="outline"
          aria-label={`Me pagaron: ${receivable.description}`}
          className="shrink-0 max-sm:size-9 max-sm:px-0"
          onClick={() => onPay(receivable)}
        >
          <HandCoins aria-hidden="true" />
          <span className="max-sm:hidden">Me pagaron</span>
        </Button>
      )}
    </li>
  )
}
