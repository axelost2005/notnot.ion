import { LIMITS } from '../constants'
import { normalizeForMatch } from '../slug/slug'

export type ParsedLine =
  | { type: 'text'; line: number; text: string }
  | { type: 'task'; line: number; text: string; title: string; boardSlug: string }

export type ParsedTask = Extract<ParsedLine, { type: 'task' }>

export type ParseNoteOptions = {
  /** Adonde van las tareas sin `@`. */
  currentBoardSlug: string
  boards: readonly { slug: string; archived: boolean }[]
}

// `[]`, `[ ]`, `- []`, `- [ ]` o `* [ ]` al principio (ignorando espacios).
const MARKER = /^\s*(?:-\s+\[ ?\]|\*\s+\[ \]|\[ ?\])/

// `@` al principio o después de un espacio: así un mail no cuenta como mención.
const MENTION = /(^|\s)@([\p{L}\p{N}-]+)/gu

export function hasTaskMarker(line: string): boolean {
  return MARKER.test(line)
}

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim()

/**
 * Convierte una nota en líneas tipadas. Una línea es tarea si arranca con un marcador y le
 * queda título. La primera mención a un tablero activo la manda ahí y sale del título; las
 * demás menciones quedan como texto.
 */
export function parseNote(content: string, { currentBoardSlug, boards }: ParseNoteOptions) {
  const activeSlugs = new Map(
    boards.filter((b) => !b.archived).map((b) => [normalizeForMatch(b.slug), b.slug]),
  )

  const lines = content.split(/\r?\n/).map((text, line): ParsedLine => {
    const marker = MARKER.exec(text)
    if (!marker) return { type: 'text', line, text }

    let rest = text.slice(marker[0].length)
    let boardSlug = currentBoardSlug
    for (const match of rest.matchAll(MENTION)) {
      const slug = activeSlugs.get(normalizeForMatch(match[2]!))
      if (!slug) continue
      boardSlug = slug
      const start = match.index + match[1]!.length
      rest = `${rest.slice(0, start)}${rest.slice(start + match[2]!.length + 1)}`
      break
    }

    const title = tidy(rest).slice(0, LIMITS.taskTitle).trim()
    if (!title) return { type: 'text', line, text }
    return { type: 'task', line, text, title, boardSlug }
  })

  return { lines, tasks: lines.filter((l): l is ParsedTask => l.type === 'task') }
}
