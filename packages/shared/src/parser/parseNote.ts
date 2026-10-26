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

/** La línea sin el marcador de tarea (para mostrar el texto original). */
export function stripTaskMarker(line: string): string {
  return line.replace(MARKER, '').trim()
}

/** Espacios de más afuera y el largo de un título. */
export const tidyTitle = (text: string) =>
  text.replace(/\s+/g, ' ').trim().slice(0, LIMITS.taskTitle).trim()

/** Los tableros activos por su slug sin mayúsculas ni acentos. */
export function activeSlugs(boards: ParseNoteOptions['boards']): Map<string, string> {
  return new Map(boards.filter((b) => !b.archived).map((b) => [normalizeForMatch(b.slug), b.slug]))
}

/**
 * Saca de `text` la primera mención a un tablero activo y dice cuál es. Las demás menciones
 * quedan como texto.
 */
export function takeMention(text: string, slugs: ReadonlyMap<string, string>) {
  for (const match of text.matchAll(MENTION)) {
    const slug = slugs.get(normalizeForMatch(match[2]!))
    if (!slug) continue
    const start = match.index + match[1]!.length
    return { rest: `${text.slice(0, start)}${text.slice(start + match[2]!.length + 1)}`, slug }
  }
  return { rest: text, slug: null }
}

/**
 * Convierte una nota en líneas tipadas. Una línea es tarea si arranca con un marcador y le
 * queda título. La primera mención a un tablero activo la manda ahí y sale del título; las
 * demás menciones quedan como texto.
 */
export function parseNote(content: string, { currentBoardSlug, boards }: ParseNoteOptions) {
  const slugs = activeSlugs(boards)

  const lines = content.split(/\r?\n/).map((text, line): ParsedLine => {
    const marker = MARKER.exec(text)
    if (!marker) return { type: 'text', line, text }

    const { rest, slug } = takeMention(text.slice(marker[0].length), slugs)
    const title = tidyTitle(rest)
    if (!title) return { type: 'text', line, text }
    return { type: 'task', line, text, title, boardSlug: slug ?? currentBoardSlug }
  })

  return { lines, tasks: lines.filter((l): l is ParsedTask => l.type === 'task') }
}
