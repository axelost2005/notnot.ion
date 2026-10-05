import type { DayItem } from '@notnot/shared'
import { LIMITS } from '@notnot/shared'
import { Check, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { isPendingItem, useDeleteDayItem, useUpdateDayItem } from './api'
import type { DayOption } from './format'

type Props = {
  item: DayItem
  /** A dónde se puede mover: hoy y los días que siguen. */
  days: DayOption[]
  /** Pendiente de un día anterior: "de ayer", "del sábado". */
  carriedFrom?: string
}

/** Una cosa de Hoy: checkbox, el texto (tocarlo lo edita) y el "…" para moverla o borrarla. */
export function DayItemRow({ item, days, carriedFrom }: Props) {
  const update = useUpdateDayItem()
  const remove = useDeleteDayItem()
  const [editing, setEditing] = useState(false)
  // El cache se actualiza después de un await: sin esto el checkbox y el texto vuelven atrás un
  // instante.
  const [sentDone, setSentDone] = useState<boolean | null>(null)
  const [sentText, setSentText] = useState<string | null>(null)
  const pending = isPendingItem(item)
  const done = sentDone ?? item.doneAt !== null
  const text = sentText ?? item.text

  function toggle() {
    setSentDone(!done)
    update.mutate({ id: item.id, done: !done }, { onSettled: () => setSentDone(null) })
  }

  function save(value: string) {
    setEditing(false)
    const next = value.trim()
    if (!next || next === text) return
    setSentText(next)
    update.mutate({ id: item.id, text: next }, { onSettled: () => setSentText(null) })
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      save(event.currentTarget.value)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setEditing(false)
    }
  }

  return (
    <li className="group flex items-start gap-1 text-sm max-md:text-[15px]">
      <label
        className={cn(
          'flex shrink-0 cursor-pointer py-2.5 pr-2 max-md:py-3 max-md:pr-2.5',
          pending && 'pointer-events-none opacity-50',
        )}
      >
        <span className="grid size-4 place-items-center max-md:size-5">
          <input
            type="checkbox"
            checked={done}
            disabled={pending}
            onChange={toggle}
            aria-label={`${done ? 'Destildar' : 'Tildar'} ${text}`}
            className="peer col-start-1 row-start-1 size-4 cursor-pointer appearance-none rounded-[4px] border border-foreground/30 bg-card outline-none checked:border-foreground checked:bg-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background max-md:size-5 max-md:rounded-[5px]"
          />
          <Check
            aria-hidden="true"
            strokeWidth={3}
            className="pointer-events-none col-start-1 row-start-1 size-3 text-background opacity-0 peer-checked:opacity-100 max-md:size-3.5"
          />
        </span>
      </label>

      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 py-2 max-md:py-2.5">
        {editing ? (
          <input
            autoFocus
            defaultValue={text}
            maxLength={LIMITS.dayItemText}
            aria-label="Texto"
            onKeyDown={onKeyDown}
            onBlur={(event) => save(event.currentTarget.value)}
            className="-mx-1 w-full rounded-sm bg-transparent px-1 outline-none ring-2 ring-ring/40 max-md:text-base"
          />
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(true)}
            aria-label={`Editar ${text}`}
            className={cn(
              'min-w-0 cursor-text rounded-sm text-left break-words outline-none focus-visible:ring-2 focus-visible:ring-ring',
              done && 'text-muted-foreground line-through decoration-foreground/40',
            )}
          >
            {text}
          </button>
        )}
        {carriedFrom && !editing && (
          <span className="text-xs whitespace-nowrap text-muted-foreground">{carriedFrom}</span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={`Opciones de ${text}`}
            className="mt-1 text-muted-foreground max-md:mt-1.5 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 pointer-fine:aria-expanded:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Mover a</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={item.day}
            onValueChange={(day) => update.mutate({ id: item.id, day })}
          >
            {days.map((option) => (
              <DropdownMenuRadioItem
                key={option.day}
                value={option.day}
                className="pointer-coarse:py-2.5"
              >
                {option.name.charAt(0).toUpperCase() + option.name.slice(1)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => remove.mutate(item.id)}>
            <Trash2 />
            Borrar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
