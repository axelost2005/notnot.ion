import { LIMITS, splitDayItems } from '@notnot/shared'
import { ArrowUp } from 'lucide-react'
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCreateDayItems } from './api'
import type { DayOption } from './format'

type Props = {
  days: DayOption[]
  /** El día elegido en los chips: se mantiene mientras se anota. */
  day: string
  onDayChange: (day: string) => void
}

// Con el dedo no se enfoca solo: abriría el teclado apenas se entra.
const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches

/** "Anotar…": Enter agrega lo escrito (una cosa por línea) y deja el campo listo para otra. */
export function DayComposer({ days, day, onDayChange }: Props) {
  const create = useCreateDayItems()
  const hintId = useId()
  const [text, setText] = useState('')
  const lines = splitDayItems(text)
  const tooMany = lines.length > LIMITS.dayItemsPerPost
  const target = days.find((option) => option.day === day) ?? days[0]!

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (lines.length === 0 || tooMany) return
    setText('')
    create.mutate(
      { day: target.day, text },
      // Si falló, lo escrito vuelve al campo (salvo que ya se haya escrito otra cosa).
      { onError: () => setText((current) => (current.trim() ? current : text)) },
    )
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    submit()
  }

  return (
    <form
      onSubmit={submit}
      className="shrink-0 border-t bg-background pb-3 max-md:border-t-0 max-md:pb-2"
    >
      <div className="mx-auto w-full max-w-2xl px-6 pt-3 max-md:px-3 max-md:pt-1">
        <fieldset>
          <legend className="sr-only">Para qué día</legend>
          {/* En el celu los días que no entran se ven corriendo los chips, no la pantalla. */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
            {days.map((option) => (
              <label
                key={option.day}
                className="flex h-7 shrink-0 cursor-pointer items-center rounded-md border px-2.5 text-xs font-medium text-muted-foreground transition-colors select-none pointer-coarse:h-9 pointer-coarse:px-3 pointer-coarse:text-sm hover:text-foreground has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-1 has-focus-visible:ring-offset-background"
              >
                <input
                  type="radio"
                  name="day"
                  value={option.day}
                  checked={option.day === target.day}
                  onChange={() => onDayChange(option.day)}
                  aria-label={option.name.charAt(0).toUpperCase() + option.name.slice(1)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-end gap-2 rounded-xl border bg-card py-1.5 pr-1.5 pl-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
          <textarea
            value={text}
            autoFocus={!isCoarsePointer()}
            rows={1}
            maxLength={LIMITS.dayItemText * LIMITS.dayItemsPerPost}
            enterKeyHint="send"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Anotar…"
            aria-label={`Anotar para ${target.name}`}
            aria-describedby={hintId}
            className="block max-h-40 min-h-7 flex-1 resize-none bg-transparent py-1 text-base leading-relaxed outline-none field-sizing-content placeholder:text-muted-foreground md:text-sm"
          />
          <Button
            type="submit"
            size="icon-sm"
            className="max-md:size-9"
            aria-label="Anotar"
            disabled={lines.length === 0 || tooMany}
          >
            <ArrowUp />
          </Button>
        </div>
        <p
          id={hintId}
          aria-live="polite"
          className={cn(
            'mt-1.5 min-h-4 px-1 text-xs',
            tooMany ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {tooMany
            ? `Hasta ${LIMITS.dayItemsPerPost} por vez`
            : lines.length > 1
              ? `${lines.length} cosas para ${target.name}`
              : null}
        </p>
      </div>
    </form>
  )
}
