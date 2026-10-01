import { LIMITS, normalizeForMatch, parseNote, type BoardSummary } from '@notnot/shared'
import { ArrowUp } from 'lucide-react'
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { boardStyle } from '../boards/colors'
import { useCreateNote } from './api'
import { tasksSummary } from './format'
import { readDraft, writeDraft } from './storage'

type Props = {
  board: BoardSummary
  boards: BoardSummary[]
  autoFocus?: boolean
}

type Mention = { start: number; query: string }

const MENTION_BEFORE_CARET = /(^|\s)@([\p{L}\p{N}-]*)$/u

function findMention(text: string, caret: number): Mention | null {
  const match = MENTION_BEFORE_CARET.exec(text.slice(0, caret))
  if (!match) return null
  return { start: match.index + match[1]!.length, query: match[2]! }
}

// En touch, Enter hace salto de línea y se envía con el botón.
const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches

export function NoteComposer({ board, boards, autoFocus }: Props) {
  const create = useCreateNote()
  const listId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const [text, setText] = useState(() => readDraft(board.id))
  const [caret, setCaret] = useState<number | null>(null)
  const [highlight, setHighlight] = useState(0)
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)

  const parsed = useMemo(
    () =>
      parseNote(text, {
        currentBoardSlug: board.slug,
        boards: boards.map((b) => ({ slug: b.slug, archived: b.archivedAt !== null })),
      }),
    [text, board.slug, boards],
  )

  const mention = caret === null ? null : findMention(text, caret)
  const query = mention ? normalizeForMatch(mention.query) : ''
  const activeBoards = boards.filter((b) => b.archivedAt === null)
  // Si ya está escrito un slug completo, la mención está lista: Enter envía.
  const complete = activeBoards.some((b) => b.slug === query)
  const suggestions =
    mention && mention.start !== dismissedAt && !complete
      ? activeBoards
          .filter((b) => normalizeForMatch(b.name).includes(query) || b.slug.includes(query))
          .slice(0, 6)
      : []
  const open = suggestions.length > 0
  const active = Math.min(highlight, suggestions.length - 1)

  // Después de insertar algo, deja el cursor donde corresponde.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el || pendingCaret.current === null) return
    el.focus()
    el.setSelectionRange(pendingCaret.current, pendingCaret.current)
    pendingCaret.current = null
  }, [text])

  function update(next: string, nextCaret?: number) {
    setText(next)
    writeDraft(board.id, next)
    if (nextCaret !== undefined) {
      pendingCaret.current = nextCaret
      setCaret(nextCaret)
    }
  }

  function pickBoard(slug: string) {
    if (!mention || caret === null) return
    const inserted = `@${slug} `
    update(
      text.slice(0, mention.start) + inserted + text.slice(caret),
      mention.start + inserted.length,
    )
    setHighlight(0)
  }

  /** El chip `[ ]`: pone el marcador al principio de la línea donde está el cursor. */
  function addMarker() {
    const at = textareaRef.current?.selectionStart ?? text.length
    const lineStart = text.lastIndexOf('\n', at - 1) + 1
    if (/^\s*(?:[-*]\s+)?\[ ?\]/.test(text.slice(lineStart))) {
      textareaRef.current?.focus()
      return
    }
    update(`${text.slice(0, lineStart)}[] ${text.slice(lineStart)}`, at + 3)
  }

  /** El chip `@`: escribe el arroba y abre el autocompletado. */
  function addMention() {
    const at = textareaRef.current?.selectionStart ?? text.length
    const needsSpace = at > 0 && !/\s/.test(text[at - 1]!)
    const inserted = needsSpace ? ' @' : '@'
    setDismissedAt(null)
    update(text.slice(0, at) + inserted + text.slice(at), at + inserted.length)
  }

  function submit() {
    const content = text.trim()
    if (
      !content ||
      parsed.tasks.length > LIMITS.tasksPerNote ||
      content.length > LIMITS.noteContent
    ) {
      return
    }
    update('')
    create.mutate(
      { board, content, boards },
      {
        // Si falló, el texto vuelve al composer (salvo que ya se haya escrito otra cosa).
        onError: () => setText((current) => (current === '' ? content : current)),
      },
    )
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setHighlight((active + step + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        pickBoard(suggestions[active]!.slug)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setDismissedAt(mention?.start ?? null)
        return
      }
    }
    if (event.key === 'Enter' && !event.shiftKey && !isCoarsePointer()) {
      event.preventDefault()
      submit()
    }
  }

  const tooMany = parsed.tasks.length > LIMITS.tasksPerNote
  const targetNames = [...new Set(parsed.tasks.map((t) => t.boardSlug))].map(
    (slug) => boards.find((b) => b.slug === slug)?.name ?? slug,
  )

  return (
    <div className="relative shrink-0 border-t p-3">
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Tableros"
          className="absolute inset-x-3 bottom-full mb-1 grid gap-px rounded-lg border bg-popover p-1 text-sm shadow-md"
        >
          {suggestions.map((b, index) => (
            <li
              key={b.id}
              id={`${listId}-${b.id}`}
              role="option"
              aria-selected={index === active}
              style={boardStyle(b.color)}
              // mousedown para no perder el foco del textarea.
              onMouseDown={(event) => {
                event.preventDefault()
                pickBoard(b.slug)
              }}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5',
                index === active && 'bg-accent',
              )}
            >
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--board)" />
              <span className="truncate">{b.name}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">@{b.slug}</span>
            </li>
          ))}
        </ul>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        autoFocus={autoFocus}
        rows={2}
        maxLength={LIMITS.noteContent}
        onChange={(event) => {
          setDismissedAt(null)
          update(event.target.value)
          setCaret(event.target.selectionStart)
        }}
        onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
        onKeyDown={onKeyDown}
        onBlur={() => setCaret(null)}
        placeholder="Escribí una nota…"
        aria-label={`Nueva nota en ${board.name}`}
        aria-describedby={`${listId}-preview`}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-activedescendant={open ? `${listId}-${suggestions[active]!.id}` : undefined}
        role="combobox"
        className="block max-h-48 min-h-14 w-full resize-none bg-transparent text-base leading-relaxed outline-none field-sizing-content placeholder:text-muted-foreground md:text-sm"
      />

      <div className="mt-2 flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="font-mono"
          onClick={addMarker}
          aria-label="Convertir la línea en tarea"
        >
          [ ]
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="font-mono"
          onClick={addMention}
          aria-label="Mandar a un tablero"
        >
          @
        </Button>
        <p
          id={`${listId}-preview`}
          aria-live="polite"
          className={cn(
            'min-w-0 flex-1 truncate px-1 text-xs',
            tooMany ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {tooMany
            ? `Hasta ${LIMITS.tasksPerNote} tareas por nota`
            : parsed.tasks.length > 0
              ? tasksSummary(parsed.tasks.length, targetNames)
              : null}
        </p>
        <Button
          type="button"
          size="icon-sm"
          aria-label="Enviar nota"
          disabled={text.trim() === '' || tooMany}
          onClick={submit}
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  )
}
