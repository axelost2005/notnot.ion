import type { BoardSummary } from '@notnot/shared'
import { cn } from '@/lib/utils'
import { boardStyle } from '../boards/colors'

type ListProps = {
  id: string
  suggestions: readonly BoardSummary[]
  active: number
  onPick: (slug: string) => void
  className?: string
}

/** La lista de tableros del autocompletado (el campo es el `combobox`). */
export function MentionList({ id, suggestions, active, onPick, className }: ListProps) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Tableros"
      className={cn(
        'z-10 grid gap-px rounded-lg border bg-popover p-1 text-sm shadow-md',
        className,
      )}
    >
      {suggestions.map((b, index) => (
        <li
          key={b.id}
          id={`${id}-${b.id}`}
          role="option"
          aria-selected={index === active}
          style={boardStyle(b.color)}
          // mousedown para no perder el foco del campo.
          onMouseDown={(event) => {
            event.preventDefault()
            onPick(b.slug)
          }}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 pointer-coarse:py-2.5',
            index === active && 'bg-accent',
          )}
        >
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--board)" />
          <span className="truncate">{b.name}</span>
          <span className="ml-auto font-mono text-xs text-muted-foreground">@{b.slug}</span>
        </li>
      ))}
    </ul>
  )
}
