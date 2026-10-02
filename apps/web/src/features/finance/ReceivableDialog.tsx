import type { Currency, Receivable } from '@notnot/shared'
import { LIMITS, monthOf, parseAmount, remainingCents } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { boardsQuery } from '../boards/api'
import { useCreateReceivable, useDeleteReceivable, useUpdateReceivable } from './api'
import { AMOUNT_ERROR, AmountField, ClientSelect, DeleteButton, fieldClass } from './fields'
import { dayParts, formatAmount, formatMoney, today } from './format'

type Props = {
  /** `'new'` para anotar una; si no, la que se edita. `null`: cerrado. */
  receivable: Receivable | 'new' | null
  onClose: () => void
}

/** Algo que te deben: concepto, monto, cuándo vence, cliente, nota y lo que ya te pagaron. */
export function ReceivableDialog({ receivable, onClose }: Props) {
  return (
    <Dialog open={receivable !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-lg">
        {receivable === 'new' && <ReceivableForm onClose={onClose} />}
        {receivable !== null && receivable !== 'new' && (
          <ReceivableForm key={receivable.id} receivable={receivable} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

const DESCRIPTION_ERROR = 'Escribí qué te deben'

function ReceivableForm({ receivable, onClose }: { receivable?: Receivable; onClose: () => void }) {
  const boards = useQuery(boardsQuery)
  const create = useCreateReceivable()
  const update = useUpdateReceivable()
  const remove = useDeleteReceivable()

  const [description, setDescription] = useState(receivable?.description ?? '')
  const [amount, setAmount] = useState(receivable ? formatAmount(receivable.amountCents) : '')
  const [currency, setCurrency] = useState<Currency>(receivable?.currency ?? 'ARS')
  const [dueDate, setDueDate] = useState(receivable?.dueDate ?? '')
  const [boardId, setBoardId] = useState(receivable?.boardId ?? null)
  const [note, setNote] = useState(receivable?.note ?? '')
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)

  const payments = receivable?.payments ?? []
  const pending = create.isPending || update.isPending

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const text = description.trim()
    const amountCents = parseAmount(amount)
    const validAmount = amountCents !== null && amountCents > 0
    setDescriptionError(text ? null : DESCRIPTION_ERROR)
    setAmountError(validAmount ? null : AMOUNT_ERROR)
    if (!text || !validAmount) return
    const values = {
      description: text,
      amountCents,
      currency,
      boardId,
      dueDate: dueDate || null,
      note: note.trim() || null,
    }
    if (receivable) update.mutate({ id: receivable.id, ...values }, { onSuccess: onClose })
    else create.mutate(values, { onSuccess: onClose })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 p-4" noValidate>
      <DialogHeader>
        <DialogTitle>{receivable ? 'Por cobrar' : 'Anotar lo que te deben'}</DialogTitle>
        <DialogDescription>Qué te deben, cuánto y para cuándo.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="receivable-description">Concepto</Label>
        <input
          id="receivable-description"
          autoFocus={!receivable}
          value={description}
          maxLength={LIMITS.receivableDescription}
          autoComplete="off"
          placeholder="Desarrollo web, segundo 50%"
          onChange={(event) => {
            setDescription(event.target.value)
            setDescriptionError(null)
          }}
          aria-invalid={descriptionError ? true : undefined}
          aria-describedby={descriptionError ? 'receivable-description-error' : undefined}
          className={fieldClass}
        />
        {descriptionError && (
          <p
            id="receivable-description-error"
            role="alert"
            className="text-[13px] text-destructive"
          >
            {descriptionError}
          </p>
        )}
      </div>

      <AmountField
        id="receivable-amount"
        amount={amount}
        onAmountChange={(value) => {
          setAmount(value)
          setAmountError(null)
        }}
        currency={currency}
        onCurrencyChange={setCurrency}
        currencyLock={payments.length > 0 ? 'Ya tiene pagos en esta moneda.' : null}
        error={amountError}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="flex h-3.5 items-center justify-between gap-2">
            <Label htmlFor="receivable-due">Vence</Label>
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="text-xs text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline"
              >
                Sin fecha
              </button>
            )}
          </div>
          <input
            id="receivable-due"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="grid gap-2">
          <Label id="receivable-client-label" className="h-3.5">
            Cliente
          </Label>
          <ClientSelect
            labelledBy="receivable-client-label"
            boards={boards.data}
            value={boardId}
            onChange={setBoardId}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="receivable-note">Nota</Label>
        <textarea
          id="receivable-note"
          rows={2}
          value={note}
          maxLength={LIMITS.receivableNote}
          placeholder="Cómo te paga, a quién reclamarle…"
          onChange={(event) => setNote(event.target.value)}
          className={cn(fieldClass, 'h-auto resize-y py-1.5 pointer-coarse:h-auto')}
        />
      </div>

      {receivable && payments.length > 0 && <Collected receivable={receivable} />}

      <DialogFooter className="justify-between">
        {receivable ? (
          <DeleteButton
            label="Borrar"
            title="¿Borrar lo que te deben?"
            description={
              payments.length > 0
                ? 'Se borra para siempre. Sus pagos quedan en Cobrado, sueltos.'
                : 'Se borra para siempre.'
            }
            pending={remove.isPending}
            onConfirm={() => remove.mutate(receivable.id, { onSuccess: onClose })}
          />
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

/** Lo que ya te pagaron de esto. Cada pago lleva a su mes, en Cobrado. */
function Collected({ receivable }: { receivable: Receivable }) {
  const remaining = remainingCents(receivable)
  const thisYear = today().slice(0, 4)

  return (
    <section aria-labelledby="receivable-payments-label" className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="receivable-payments-label" className="text-sm leading-none font-medium">
          Pagos
        </h3>
        <p className="text-xs text-muted-foreground tabular-nums">
          {remaining > 0
            ? `Faltan ${formatMoney(remaining, receivable.currency)} de ${formatMoney(receivable.amountCents, receivable.currency)}`
            : 'Cobrada'}
        </p>
      </div>
      <ul className="divide-y rounded-lg border">
        {receivable.payments.map((payment) => {
          const { day, month } = dayParts(payment.date)
          const year = payment.date.slice(0, 4)
          return (
            <li key={payment.id}>
              <Link
                to={`/finanzas/${monthOf(payment.date)}`}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  {day} {month}
                  {year !== thisYear && ` ${year}`}
                </span>
                <span className="font-medium tabular-nums">
                  {formatMoney(payment.amountCents, receivable.currency)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
