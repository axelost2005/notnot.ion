import { LIMITS, parseNote, type BoardSummary } from '@notnot/shared'
import { ArrowUp } from 'lucide-react'
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCreateNote } from './api'
import { tasksSummary } from './format'
import { MentionList } from './MentionList'
import { useMentions } from './useMentions'
import { readDraft, writeDraft } from './storage'

type Props = {
  board: BoardSummary
  boards: BoardSummary[]
  autoFocus?: boolean
}

// En touch, Enter hace salto de línea y se envía con el botón.
const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches

/** El composer arranca listo para una tarea: escribir y dar Enter crea una tarjeta. */
const TASK_PREFIX = '[] '

/** Vacío o solo con el marcador: no hay nada para mandar ni para guardar como borrador. */
const isBlank = (text: string) => text.trim() === '' || text.trim() === '[]'

export function NoteComposer({ board, boards, autoFocus }: Props) {
  const create = useCreateNote()
  const listId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const [text, setText] = useState(() => readDraft(board.id) || TASK_PREFIX)
  const mentions = useMentions(text, boards)
  const { open, suggestions, active } = mentions

  const parsed = useMemo(
    () =>
      parseNote(text, {
        currentBoardSlug: board.slug,
        boards: boards.map((b) => ({ slug: b.slug, archived: b.archivedAt !== null })),
      }),
    [text, board.slug, boards],
  )

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
    writeDraft(board.id, isBlank(next) ? '' : next)
    if (nextCaret !== undefined) {
      pendingCaret.current = nextCaret
      mentions.setCaret(nextCaret)
    }
  }

  function pickBoard(slug: string) {
    const picked = mentions.pick(slug)
    if (picked) update(picked.text, picked.caret)
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
    mentions.undismiss()
    update(text.slice(0, at) + inserted + text.slice(at), at + inserted.length)
  }

  function submit() {
    const content = text.trim()
    if (
      isBlank(text) ||
      parsed.tasks.length > LIMITS.tasksPerNote ||
      content.length > LIMITS.noteContent
    ) {
      return
    }
    // Queda listo para la próxima tarea, con el cursor después de los corchetes.
    update(TASK_PREFIX, TASK_PREFIX.length)
    create.mutate(
      { board, content, boards },
      {
        // Si falló, el texto vuelve al composer (salvo que ya se haya escrito otra cosa).
        onError: () => setText((current) => (isBlank(current) ? content : current)),
      },
    )
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentions.onKeyDown(event, pickBoard)) return
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
    // En el celu, un bloque aparte como el campo de un chat.
    <div className="relative shrink-0 border-t p-3 max-md:mx-3 max-md:mt-1 max-md:mb-3 max-md:rounded-2xl max-md:border max-md:bg-card max-md:pb-2 max-md:focus-within:border-ring max-md:focus-within:ring-3 max-md:focus-within:ring-ring/20">
      {open && (
        <MentionList
          id={listId}
          suggestions={suggestions}
          active={active}
          onPick={pickBoard}
          className="absolute inset-x-3 bottom-full mb-1"
        />
      )}

      <textarea
        ref={textareaRef}
        value={text}
        autoFocus={autoFocus}
        rows={2}
        maxLength={LIMITS.noteContent}
        onChange={(event) => {
          mentions.undismiss()
          update(event.target.value)
          mentions.setCaret(event.target.selectionStart)
        }}
        onSelect={(event) => mentions.setCaret(event.currentTarget.selectionStart)}
        onFocus={(event) => {
          // Al entrar con Tab o al abrirse enfocado, el cursor queda al principio: va después
          // de los corchetes. Si ya hay algo seleccionado, se respeta.
          const el = event.currentTarget
          if (!isBlank(text) || el.selectionStart !== 0 || el.selectionEnd !== 0) return
          el.setSelectionRange(el.value.length, el.value.length)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => mentions.setCaret(null)}
        placeholder="Escribí una nota…"
        aria-label={`Nueva nota en ${board.name}`}
        aria-describedby={`${listId}-preview`}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-activedescendant={open ? `${listId}-${suggestions[active]!.id}` : undefined}
        role="combobox"
        className="block max-h-48 min-h-14 w-full resize-none bg-transparent text-base leading-relaxed outline-none field-sizing-content placeholder:text-muted-foreground max-md:min-h-7 md:text-sm"
      />

      <div className="mt-2 flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="font-mono max-md:h-9 max-md:px-3.5 max-md:text-sm"
          onClick={addMarker}
          aria-label="Convertir la línea en tarea"
        >
          [ ]
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="font-mono max-md:h-9 max-md:px-3.5 max-md:text-sm"
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
          className="max-md:size-9"
          aria-label="Enviar nota"
          disabled={isBlank(text) || tooMany}
          onClick={submit}
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  )
}
