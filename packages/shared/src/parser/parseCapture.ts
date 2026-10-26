import { activeSlugs, takeMention, tidyTitle, type ParseNoteOptions } from './parseNote'

export type CapturedTask = { title: string; boardSlug: string }

// Viñeta ("- ", "* ", "• ") y/o casilla ("[]", "[ ]", "[x]") al principio de una línea pegada.
const BULLET = /^\s*(?:[-*•](?:\s+|$))?(?:\[[ xX]?\](?:\s+|$))?/

/**
 * Lo escrito o pegado en "Anotar…": una tarea por línea, sin viñetas ni corchetes del principio.
 * La primera mención a un tablero activo la manda ahí y sale del título; sin mención, va al
 * tablero actual. Las líneas que quedan vacías no cuentan.
 */
export function parseCapture(
  text: string,
  { currentBoardSlug, boards }: ParseNoteOptions,
): CapturedTask[] {
  const slugs = activeSlugs(boards)
  return text.split(/\r?\n/).flatMap((line) => {
    const { rest, slug } = takeMention(line.replace(BULLET, ''), slugs)
    const title = tidyTitle(rest)
    return title ? [{ title, boardSlug: slug ?? currentBoardSlug }] : []
  })
}
