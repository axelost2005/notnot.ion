import type { Currency, Payment, Receivable } from '@notnot/shared'
import { LIMITS, normalizeForMatch, parseAmount, remainingCents } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { ImagePlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ImageGallery } from '@/components/images/ImageGallery'
import { useImageDrop } from '@/components/images/useImageDrop'
import { usePendingImages } from '@/components/images/usePendingImages'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { boardsQuery } from '../boards/api'
import {
  paymentsSummaryQuery,
  receivablesQuery,
  useAddReceipt,
  useCreatePayment,
  useDeletePayment,
  useDeleteReceipt,
  useUpdatePayment,
} from './api'
import { AMOUNT_ERROR, AmountField, ClientSelect, DeleteButton, fieldClass } from './fields'
import { formatAmount, formatMoney, today } from './format'

type Props = {
  /** `'new'` para anotar uno; si no, el pago a editar. `null`: cerrado. */
  payment: Payment | 'new' | null
  /** El mes que se está viendo: la fecha de uno nuevo cae ahí. */
  month: string
  /** "Me pagaron": uno nuevo de algo por cobrar, ya completo con lo que falta. */
  receivable?: Receivable
  onClose: () => void
}

export function PaymentDialog({ payment, month, receivable, onClose }: Props) {
  return (
    <Dialog open={payment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-lg">
        {payment === 'new' && (
          <PaymentForm
            key={receivable?.id ?? 'new'}
            month={month}
            receivable={receivable}
            onClose={onClose}
          />
        )}
        {payment !== null && payment !== 'new' && (
          <PaymentForm key={payment.id} payment={payment} month={month} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

type QueuedImage = { key: string; url: string; file: File }

function PaymentForm({
  payment,
  month,
  receivable,
  onClose,
}: {
  payment?: Payment
  month: string
  receivable?: Receivable
  onClose: () => void
}) {
  const boards = useQuery(boardsQuery)
  const summary = useQuery(paymentsSummaryQuery)
  const receivables = useQuery(receivablesQuery)
  const create = useCreatePayment()
  const update = useUpdatePayment()
  const remove = useDeletePayment()
  const addReceipt = useAddReceipt()
  const deleteReceipt = useDeleteReceipt()

  const [amount, setAmount] = useState(() =>
    payment
      ? formatAmount(payment.amountCents)
      : receivable
        ? formatAmount(remainingCents(receivable))
        : '',
  )
  const [currency, setCurrency] = useState<Currency>(
    payment?.currency ?? receivable?.currency ?? 'ARS',
  )
  const [date, setDate] = useState(
    () => payment?.date ?? (today().startsWith(month) ? today() : `${month}-01`),
  )
  const [boardId, setBoardId] = useState(payment?.boardId ?? receivable?.boardId ?? null)
  const [category, setCategory] = useState(payment?.category ?? '')
  const [description, setDescription] = useState(
    payment?.description ?? receivable?.description ?? '',
  )
  const [receivableId, setReceivableId] = useState(payment?.receivableId ?? receivable?.id ?? null)
  const [amountError, setAmountError] = useState<string | null>(null)
  // Uno nuevo todavía no existe en la API: los comprobantes esperan a que se guarde.
  const [queued, setQueued] = useState<QueuedImage[]>([])

  const uploads = usePendingImages((file, done) => {
    if (payment) addReceipt.mutate({ payment, file }, { onSettled: done })
  })
  const receipts = payment?.images ?? []
  const room = LIMITS.imagesPerPayment - receipts.length - uploads.pending.length - queued.length

  function addImages(files: File[]) {
    if (files.length > room)
      toast.error(`Un pago tiene hasta ${LIMITS.imagesPerPayment} comprobantes`)
    const accepted = files.slice(0, Math.max(0, room))
    if (payment) uploads.add(accepted)
    else {
      setQueued((list) => [
        ...list,
        ...accepted.map((file) => ({
          key: crypto.randomUUID(),
          url: URL.createObjectURL(file),
          file,
        })),
      ])
    }
  }
  const drop = useImageDrop(addImages)

  function unqueue(key: string) {
    setQueued((list) => {
      const item = list.find((q) => q.key === key)
      if (item) URL.revokeObjectURL(item.url)
      return list.filter((q) => q.key !== key)
    })
  }

  // Lo que se puede cobrar con este pago: lo pendiente, más lo que ya tiene vinculado.
  const linkable = (receivables.data ?? []).filter(
    (r) => remainingCents(r) > 0 || r.id === receivableId,
  )
  const linked = linkable.find((r) => r.id === receivableId)

  /** Al elegir de qué es, el pago toma su moneda y completa lo que esté vacío. */
  function link(next: Receivable | null) {
    setReceivableId(next?.id ?? null)
    if (!next) return
    setCurrency(next.currency)
    if (!boardId) setBoardId(next.boardId)
    if (!amount.trim()) setAmount(formatAmount(remainingCents(next)))
    if (!description.trim()) setDescription(next.description)
  }

  const typed = normalizeForMatch(category.trim())
  const suggestions = (summary.data?.categories ?? [])
    .filter((c) => normalizeForMatch(c) !== typed && normalizeForMatch(c).includes(typed))
    .slice(0, 8)
  const pending = create.isPending || update.isPending

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const amountCents = parseAmount(amount)
    if (amountCents === null || amountCents <= 0) {
      setAmountError(AMOUNT_ERROR)
      return
    }
    const values = {
      date,
      amountCents,
      currency,
      boardId,
      category: category.trim() || null,
      description: description.trim() || null,
      receivableId,
    }
    if (payment) {
      update.mutate({ id: payment.id, ...values }, { onSuccess: onClose })
      return
    }
    create.mutate(values, {
      onSuccess: (created) => {
        // Los comprobantes suben solos después; si alguno falla, sale el error.
        for (const item of queued) {
          addReceipt.mutate(
            { payment: created, file: item.file },
            { onSettled: () => URL.revokeObjectURL(item.url) },
          )
        }
        onClose()
      },
    })
  }

  return (
    <form onSubmit={onSubmit} {...drop.handlers} className="relative grid gap-5 p-4" noValidate>
      {drop.dragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-lg border-2 border-dashed border-foreground/30 bg-popover/90"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ImagePlus className="size-4" />
            Soltá el comprobante para adjuntarlo
          </span>
        </div>
      )}
      <DialogHeader>
        <DialogTitle>{payment ? 'Pago' : 'Anotar un pago'}</DialogTitle>
        <DialogDescription>Lo que te pagaron, con sus comprobantes.</DialogDescription>
      </DialogHeader>

      <AmountField
        id="payment-amount"
        autoFocus={!payment}
        amount={amount}
        onAmountChange={(value) => {
          setAmount(value)
          setAmountError(null)
        }}
        currency={currency}
        onCurrencyChange={setCurrency}
        currencyLock={linked ? 'En la moneda de lo que te deben.' : null}
        error={amountError}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="payment-date">Fecha</Label>
          <input
            id="payment-date"
            type="date"
            required
            value={date}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="grid gap-2">
          <Label id="payment-client-label">Cliente</Label>
          <ClientSelect
            labelledBy="payment-client-label"
            boards={boards.data}
            value={boardId}
            onChange={setBoardId}
          />
        </div>
      </div>

      {linkable.length > 0 && (
        <div className="grid gap-2">
          <Label id="payment-receivable-label">Por cobrar</Label>
          <ReceivableSelect options={linkable} value={receivableId} onChange={link} />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="payment-category">Categoría</Label>
        <input
          id="payment-category"
          value={category}
          maxLength={LIMITS.paymentCategory}
          autoComplete="off"
          placeholder="Diseño, mantenimiento…"
          onChange={(event) => setCategory(event.target.value)}
          className={fieldClass}
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Categorías usadas">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setCategory(suggestion)}
                className="h-7 rounded-md border px-2 text-xs text-muted-foreground outline-none hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-8"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payment-description">Descripción</Label>
        <textarea
          id="payment-description"
          rows={2}
          value={description}
          maxLength={LIMITS.paymentDescription}
          placeholder="Qué se pagó: un trabajo, una cuota, un adelanto…"
          onChange={(event) => setDescription(event.target.value)}
          className={cn(fieldClass, 'h-auto resize-y py-1.5')}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span id="payment-receipts-label" className="text-sm leading-none font-medium">
            Comprobantes
          </span>
          <span className="text-xs text-muted-foreground pointer-coarse:hidden">
            Pegá o arrastrá una imagen
          </span>
        </div>
        <ImageGallery
          labelledBy="payment-receipts-label"
          images={receipts}
          pending={[
            ...uploads.pending,
            ...queued.map(({ key, url }) => ({ key, url, queued: true })),
          ]}
          canAdd={room > 0}
          onAdd={addImages}
          onDelete={(image) => payment && deleteReceipt.mutate({ payment, imageId: image.id })}
          onRemovePending={unqueue}
        />
      </div>

      <DialogFooter className="sm:justify-between">
        {payment ? (
          <DeleteButton
            label="Borrar pago"
            title="¿Borrar el pago?"
            description="Se borra para siempre, con sus comprobantes."
            pending={remove.isPending}
            onConfirm={() => remove.mutate(payment.id, { onSuccess: onClose })}
          />
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
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

const NO_RECEIVABLE = 'ninguno'

/** De qué cosa por cobrar es el pago (o de ninguna: un pago suelto). */
function ReceivableSelect({
  options,
  value,
  onChange,
}: {
  options: Receivable[]
  value: string | null
  onChange: (receivable: Receivable | null) => void
}) {
  return (
    <Select
      value={value ?? NO_RECEIVABLE}
      onValueChange={(id) => onChange(options.find((r) => r.id === id) ?? null)}
    >
      <SelectTrigger aria-labelledby="payment-receivable-label" className="h-9 w-full min-w-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-w-[calc(100vw-2rem)]">
        <SelectItem value={NO_RECEIVABLE}>Nada: es un pago suelto</SelectItem>
        {options.map((r) => {
          const remaining = remainingCents(r)
          return (
            <SelectItem key={r.id} value={r.id} className="*:[span]:last:min-w-0">
              <span className="truncate">{r.description}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {remaining > 0 ? `faltan ${formatMoney(remaining, r.currency)}` : 'cobrada'}
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
