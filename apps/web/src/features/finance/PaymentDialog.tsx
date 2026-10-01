import type { BoardSummary, Currency, Payment } from '@notnot/shared'
import { CURRENCIES, LIMITS, normalizeForMatch, parseAmount } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ImageGallery } from '@/components/images/ImageGallery'
import { useImageDrop } from '@/components/images/useImageDrop'
import { usePendingImages } from '@/components/images/usePendingImages'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import { boardStyle } from '../boards/colors'
import {
  paymentsSummaryQuery,
  useAddReceipt,
  useCreatePayment,
  useDeletePayment,
  useDeleteReceipt,
  useUpdatePayment,
} from './api'
import { formatAmount, today } from './format'

type Props = {
  /** `'new'` para anotar uno; si no, el pago a editar. `null`: cerrado. */
  payment: Payment | 'new' | null
  /** El mes que se está viendo: la fecha de uno nuevo cae ahí. */
  month: string
  onClose: () => void
}

export function PaymentDialog({ payment, month, onClose }: Props) {
  return (
    <Dialog open={payment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-lg">
        {payment === 'new' && <PaymentForm month={month} onClose={onClose} />}
        {payment !== null && payment !== 'new' && (
          <PaymentForm key={payment.id} payment={payment} month={month} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

const NO_CLIENT = 'ninguno'
const field =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30'

type QueuedImage = { key: string; url: string; file: File }

function PaymentForm({
  payment,
  month,
  onClose,
}: {
  payment?: Payment
  month: string
  onClose: () => void
}) {
  const boards = useQuery(boardsQuery)
  const summary = useQuery(paymentsSummaryQuery)
  const create = useCreatePayment()
  const update = useUpdatePayment()
  const remove = useDeletePayment()
  const addReceipt = useAddReceipt()
  const deleteReceipt = useDeleteReceipt()

  const [amount, setAmount] = useState(payment ? formatAmount(payment.amountCents) : '')
  const [currency, setCurrency] = useState<Currency>(payment?.currency ?? 'ARS')
  const [date, setDate] = useState(
    () => payment?.date ?? (today().startsWith(month) ? today() : `${month}-01`),
  )
  const [boardId, setBoardId] = useState(payment?.boardId ?? null)
  const [category, setCategory] = useState(payment?.category ?? '')
  const [description, setDescription] = useState(payment?.description ?? '')
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

  const clients = (boards.data ?? []).filter(
    (b) => !b.isGeneral && (b.archivedAt === null || b.id === boardId),
  )
  const typed = normalizeForMatch(category.trim())
  const suggestions = (summary.data?.categories ?? [])
    .filter((c) => normalizeForMatch(c) !== typed && normalizeForMatch(c).includes(typed))
    .slice(0, 8)
  const pending = create.isPending || update.isPending

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const amountCents = parseAmount(amount)
    if (amountCents === null || amountCents <= 0) {
      setAmountError('Escribí un monto, por ejemplo 150.000 o 1.234,50')
      return
    }
    const values = {
      date,
      amountCents,
      currency,
      boardId,
      category: category.trim() || null,
      description: description.trim() || null,
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

      <div className="grid gap-2">
        <Label htmlFor="payment-amount">Monto</Label>
        <div className="flex gap-2">
          <input
            id="payment-amount"
            autoFocus={!payment}
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            placeholder="150.000"
            onChange={(event) => {
              setAmount(event.target.value)
              setAmountError(null)
            }}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? 'payment-amount-error' : undefined}
            className={cn(field, 'flex-1 tabular-nums')}
          />
          <fieldset className="flex shrink-0 rounded-lg border border-input p-0.5">
            <legend className="sr-only">Moneda</legend>
            {CURRENCIES.map((option) => (
              <label key={option} className="relative">
                <input
                  type="radio"
                  name="currency"
                  value={option}
                  checked={currency === option}
                  onChange={() => setCurrency(option)}
                  className="peer sr-only"
                />
                <span className="grid h-7 cursor-pointer place-items-center rounded-md px-3 text-sm font-medium text-muted-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                  {option}
                </span>
              </label>
            ))}
          </fieldset>
        </div>
        {amountError && (
          <p id="payment-amount-error" role="alert" className="text-[13px] text-destructive">
            {amountError}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="payment-date">Fecha</Label>
          <input
            id="payment-date"
            type="date"
            required
            value={date}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            className={field}
          />
        </div>
        <div className="grid gap-2">
          <Label id="payment-client-label">Cliente</Label>
          <ClientSelect clients={clients} value={boardId} onChange={setBoardId} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payment-category">Categoría</Label>
        <input
          id="payment-category"
          value={category}
          maxLength={LIMITS.paymentCategory}
          autoComplete="off"
          placeholder="Diseño, mantenimiento…"
          onChange={(event) => setCategory(event.target.value)}
          className={field}
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
          className={cn(field, 'h-auto resize-y py-1.5')}
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
          <DeletePaymentButton
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

function ClientSelect({
  clients,
  value,
  onChange,
}: {
  clients: BoardSummary[]
  value: string | null
  onChange: (boardId: string | null) => void
}) {
  return (
    <Select value={value ?? NO_CLIENT} onValueChange={(v) => onChange(v === NO_CLIENT ? null : v)}>
      <SelectTrigger aria-labelledby="payment-client-label" className="h-9 w-full min-w-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_CLIENT}>Sin cliente</SelectItem>
        {clients.map((board) => (
          <SelectItem key={board.id} value={board.id}>
            <span
              aria-hidden="true"
              style={boardStyle(board.color)}
              className="size-2 shrink-0 rounded-full bg-(--board)"
            />
            <span className="truncate">{board.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DeletePaymentButton({ pending, onConfirm }: { pending: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
          <Trash2 />
          Borrar pago
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar el pago?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borra para siempre, con sus comprobantes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={onConfirm}>
            Borrar pago
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
