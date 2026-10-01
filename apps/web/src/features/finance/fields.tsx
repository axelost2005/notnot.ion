import type { BoardSummary, Currency } from '@notnot/shared'
import { CURRENCIES } from '@notnot/shared'
import { Trash2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { boardStyle } from '../boards/colors'

// Campos que comparten el formulario de un pago y el de algo por cobrar.

export const fieldClass =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30'

export const AMOUNT_ERROR = 'Escribí un monto, por ejemplo 150.000 o 1.234,50'

type AmountFieldProps = {
  id: string
  amount: string
  onAmountChange: (amount: string) => void
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
  /** Si la moneda no se puede cambiar, por qué. */
  currencyLock?: string | null
  error: string | null
  autoFocus?: boolean
}

/** El monto como se escribe acá ("150.000", "1.234,50") y la moneda al lado. */
export function AmountField({
  id,
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  currencyLock,
  error,
  autoFocus,
}: AmountFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Monto</Label>
      <div className="flex gap-2">
        <input
          id={id}
          autoFocus={autoFocus}
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          placeholder="150.000"
          onChange={(event) => onAmountChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(fieldClass, 'flex-1 tabular-nums')}
        />
        <fieldset
          disabled={Boolean(currencyLock)}
          className="flex shrink-0 rounded-lg border border-input p-0.5 disabled:opacity-60"
        >
          <legend className="sr-only">Moneda</legend>
          {CURRENCIES.map((option) => (
            <label key={option} className="relative">
              <input
                type="radio"
                name={`${id}-currency`}
                value={option}
                checked={currency === option}
                onChange={() => onCurrencyChange(option)}
                className="peer sr-only"
              />
              <span className="grid h-7 cursor-pointer place-items-center rounded-md px-3 text-sm font-medium text-muted-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed">
                {option}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
      {currencyLock && <p className="text-xs text-muted-foreground">{currencyLock}</p>}
    </div>
  )
}

const NO_CLIENT = 'ninguno'

/**
 * Los clientes son los tableros activos (sin General), más el que ya está elegido aunque esté
 * archivado.
 */
export function ClientSelect({
  boards,
  value,
  onChange,
  labelledBy,
}: {
  boards: BoardSummary[] | undefined
  value: string | null
  onChange: (boardId: string | null) => void
  labelledBy: string
}) {
  const clients = (boards ?? []).filter(
    (b) => !b.isGeneral && (b.archivedAt === null || b.id === value),
  )

  return (
    <Select value={value ?? NO_CLIENT} onValueChange={(v) => onChange(v === NO_CLIENT ? null : v)}>
      <SelectTrigger aria-labelledby={labelledBy} className="h-9 w-full min-w-0">
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

/** "Borrar" al pie del formulario, con confirmación. */
export function DeleteButton({
  label,
  title,
  description,
  pending,
  onConfirm,
}: {
  label: string
  title: string
  description: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
          <Trash2 />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={onConfirm}>
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
