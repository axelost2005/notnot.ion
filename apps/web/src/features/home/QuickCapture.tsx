import { LIMITS, parseCapture, sortByPosition, type BoardSummary, type Task } from '@notnot/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUp, Plus } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import { boardQuery, boardsQuery } from '../boards/api'
import { today as getToday } from '../finance/format'
import { tasksSummary } from '../notes/format'
import { MentionList } from '../notes/MentionList'
import { useMentions } from '../notes/useMentions'
import { dayOptions } from '../today/format'
import { overviewQuery, useCaptureTasks } from './api'
import { capturedMessage } from './format'

type Props = {
  /** Sin `@`, las tareas van a este tablero. Sin tablero, a General. */
  board?: BoardSummary
  /** El chip elegido al entrar: Hoy o "Sin día". */
  forToday: boolean
  autoFocus?: boolean
  /** Se crearon. Si no se pasa, avisa con un toast a dónde fueron. */
  onCreated?: (tasks: Task[]) => void
  className?: string
}

/** El chip "Sin día". */
const NO_DAY = ''

// En touch, Enter hace salto de línea y se anota con el botón.
const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches

/**
 * "Anotar…": una tarea por línea, con `@tablero` para mandarla a un cliente y chips para el día.
 * Enter anota y deja el campo listo para otra (Shift+Enter, salto de línea).
 */
export function QuickCapture({ board, forToday, autoFocus, onCreated, className }: Props) {
  const queryClient = useQueryClient()
  const boards = useQuery(boardsQuery)
  const overview = useQuery(overviewQuery)
  const capture = useCaptureTasks()
  const listId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const today = getToday()
  const days = dayOptions(today)
  const [text, setText] = useState('')
  const [day, setDay] = useState(forToday ? today : NO_DAY)
  // En el celu no entra la ayuda del `@` en el campo: queda el autocompletado.
  const wide = useMediaQuery('(min-width: 48rem)')

  const allBoards = boards.data ?? []
  const mentions = useMentions(text, allBoards)
  const target = board ?? allBoards.find((b) => b.isGeneral)
  const parsed = target
    ? parseCapture(text, {
        currentBoardSlug: target.slug,
        boards: allBoards.map((b) => ({ slug: b.slug, archived: b.archivedAt !== null })),
      })
    : []
  const tooMany = parsed.length > LIMITS.tasksPerCapture
  const targetNames = [...new Set(parsed.map((task) => task.boardSlug))].map(
    (slug) => allBoards.find((b) => b.slug === slug)?.name ?? slug,
  )
  // Solo hace falta decir a dónde van si son varias o si alguna va a otro tablero.
  const summary =
    parsed.length > 1 || parsed.some((task) => task.boardSlug !== target?.slug)
      ? tasksSummary(parsed.length, targetNames)
      : null

  // Después de elegir un tablero del autocompletado, deja el cursor después de la mención.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el || pendingCaret.current === null) return
    el.focus()
    el.setSelectionRange(pendingCaret.current, pendingCaret.current)
    pendingCaret.current = null
  }, [text])

  function pickBoard(slug: string) {
    const picked = mentions.pick(slug)
    if (!picked) return
    pendingCaret.current = picked.caret
    mentions.setCaret(picked.caret)
    setText(picked.text)
  }

  /** La primera columna normal de un tablero: ahí van las tareas nuevas. */
  function firstColumn(boardId: string) {
    const fromOverview = overview.data?.columns.filter((c) => c.boardId === boardId) ?? []
    // Un tablero archivado no está en lo del Inicio, pero sí su detalle si está abierto.
    const columns = fromOverview.length
      ? fromOverview
      : (queryClient.getQueryData(boardQuery(boardId).queryKey)?.columns ?? [])
    return sortByPosition(columns.filter((c) => !c.isDone))[0]
  }

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (parsed.length === 0 || tooMany) return
    const items = parsed.map((task) => {
      const boardId = allBoards.find((b) => b.slug === task.boardSlug)?.id
      return { columnId: boardId && firstColumn(boardId)?.id, title: task.title, day: day || null }
    })
    if (items.some((item) => !item.columnId)) {
      toast.error('Todavía no cargaron los tableros. Probá de nuevo en un momento.')
      return
    }
    const sent = text
    setText('')
    capture.mutate(
      items.map((item) => ({ ...item, columnId: item.columnId! })),
      {
        onSuccess: (created) => {
          if (onCreated) onCreated(created)
          else toast.success(capturedMessage(created, allBoards, today))
        },
        // Si falló, lo escrito vuelve al campo (salvo que ya se haya escrito otra cosa).
        onError: () => setText((current) => (current.trim() ? current : sent)),
      },
    )
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentions.onKeyDown(event, pickBoard)) return
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    if (isCoarsePointer()) return
    event.preventDefault()
    submit()
  }

  const chips = [...days, { day: NO_DAY, label: 'Sin día', name: 'sin día' }]
  const chosen = chips.find((option) => option.day === day) ?? chips[0]!

  return (
    <form onSubmit={submit} className={cn('relative', className)}>
      <div className="rounded-xl border bg-card shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <div className="flex items-start gap-2 pt-1.5 pr-1.5 pl-3">
          <Plus aria-hidden="true" className="mt-2 size-4 shrink-0 text-muted-foreground" />
          <textarea
            ref={textareaRef}
            value={text}
            autoFocus={autoFocus && !isCoarsePointer()}
            rows={1}
            maxLength={LIMITS.taskTitle * LIMITS.tasksPerCapture}
            enterKeyHint="send"
            onChange={(event) => {
              mentions.undismiss()
              setText(event.target.value)
              mentions.setCaret(event.target.selectionStart)
            }}
            onSelect={(event) => mentions.setCaret(event.currentTarget.selectionStart)}
            onBlur={() => mentions.setCaret(null)}
            onKeyDown={onKeyDown}
            placeholder={
              board
                ? `Anotar en ${board.name}…`
                : wide
                  ? 'Anotar una tarea… sumá @cliente para mandarla'
                  : 'Anotar una tarea…'
            }
            aria-label={
              board ? `Anotar en ${board.name}, para ${chosen.name}` : `Anotar, para ${chosen.name}`
            }
            aria-describedby={`${listId}-hint`}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={mentions.open ? listId : undefined}
            aria-expanded={mentions.open}
            aria-activedescendant={
              mentions.open ? `${listId}-${mentions.suggestions[mentions.active]!.id}` : undefined
            }
            className="block max-h-40 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-base leading-relaxed outline-none field-sizing-content placeholder:text-muted-foreground md:text-sm"
          />
          <Button
            type="submit"
            size="icon-sm"
            aria-label="Anotar"
            disabled={parsed.length === 0 || tooMany || capture.isPending}
            className="mt-0.5 max-md:size-9"
          >
            <ArrowUp />
          </Button>
        </div>
        <div className="flex items-center gap-3 px-2 pt-1 pb-2">
          {/* `min-w-0`: un fieldset no se achica por debajo de su contenido y los chips lo estiraban. */}
          <fieldset className="min-w-0 flex-1">
            <legend className="sr-only">Para qué día</legend>
            {/* En el celu los días que no entran se ven corriendo los chips, no la pantalla. */}
            <div className="flex gap-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]">
              {chips.map((option) => (
                <label
                  key={option.day}
                  className="relative flex h-6 shrink-0 items-center rounded-md border px-2 text-xs font-medium text-muted-foreground transition-colors select-none pointer-coarse:h-8 pointer-coarse:px-2.5 pointer-coarse:text-[13px] hover:text-foreground has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-1 has-focus-visible:ring-offset-card"
                >
                  <input
                    type="radio"
                    name={`${listId}-day`}
                    value={option.day}
                    checked={option.day === chosen.day}
                    onChange={() => setDay(option.day)}
                    aria-label={option.name.charAt(0).toUpperCase() + option.name.slice(1)}
                    // Tapa todo el chip: se toca (y se prueba) como un radio común.
                    className="absolute inset-0 cursor-pointer appearance-none rounded-md outline-none"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <p
            id={`${listId}-hint`}
            aria-live="polite"
            className={cn(
              'shrink-0 truncate pr-1 text-xs max-md:hidden',
              tooMany ? 'text-destructive max-md:block' : 'text-muted-foreground',
            )}
          >
            {tooMany ? `Hasta ${LIMITS.tasksPerCapture} por vez` : summary}
          </p>
        </div>
      </div>
      {mentions.open && (
        <MentionList
          id={listId}
          suggestions={mentions.suggestions}
          active={mentions.active}
          onPick={pickBoard}
          className="absolute inset-x-0 top-full z-20 mt-1"
        />
      )}
    </form>
  )
}
