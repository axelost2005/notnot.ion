import { normalizeForMatch, type BoardSummary } from '@notnot/shared'
import { useState, type KeyboardEvent } from 'react'

type Mention = { start: number; query: string }

const MENTION_BEFORE_CARET = /(^|\s)@([\p{L}\p{N}-]*)$/u

function findMention(text: string, caret: number): Mention | null {
  const match = MENTION_BEFORE_CARET.exec(text.slice(0, caret))
  if (!match) return null
  return { start: match.index + match[1]!.length, query: match[2]! }
}

/**
 * El autocompletado de `@` de un campo de texto: los tableros activos por nombre o slug mientras
 * se escribe una mención. Lo usan las notas del tablero y "Anotar…".
 */
export function useMentions(text: string, boards: readonly BoardSummary[]) {
  const [caret, setCaret] = useState<number | null>(null)
  const [highlight, setHighlight] = useState(0)
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)

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

  /** El texto con el tablero elegido en lugar de lo escrito, y dónde queda el cursor. */
  function pick(slug: string) {
    if (!mention || caret === null) return null
    const inserted = `@${slug} `
    setHighlight(0)
    return {
      text: text.slice(0, mention.start) + inserted + text.slice(caret),
      caret: mention.start + inserted.length,
    }
  }

  /** Flechas, Enter/Tab y Escape mientras la lista está abierta. Devuelve si lo usó. */
  function onKeyDown(event: KeyboardEvent, onPick: (slug: string) => void) {
    if (!open) return false
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setHighlight((active + step + suggestions.length) % suggestions.length)
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      onPick(suggestions[active]!.slug)
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      // Que el Esc no cierre también el panel o el diálogo de afuera.
      event.stopPropagation()
      setDismissedAt(mention?.start ?? null)
      return true
    }
    return false
  }

  return {
    suggestions,
    open,
    active,
    pick,
    onKeyDown,
    setCaret,
    /** Al escribir de nuevo, la lista que se cerró con Esc vuelve a abrirse. */
    undismiss: () => setDismissedAt(null),
  }
}
