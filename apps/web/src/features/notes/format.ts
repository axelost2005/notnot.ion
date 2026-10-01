const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto', style: 'short' })
const shortDate = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
const fullDate = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "recién", "hace 5 min", "hace 3 h", "ayer", "hace 4 días" y, más atrás, la fecha. */
export function timeAgo(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime()
  if (diff < MINUTE) return 'recién'
  if (diff < HOUR) return relative.format(-Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return relative.format(-Math.floor(diff / HOUR), 'hour')
  if (diff < 7 * DAY) return relative.format(-Math.floor(diff / DAY), 'day')
  return shortDate.format(new Date(iso))
}

export const fullDateTime = (iso: string) => fullDate.format(new Date(iso))

const URL_PATTERN = /(https?:\/\/[^\s<>]*[^\s<>.,;:!?)\]'"])/g

/** Parte un texto en pedazos de texto y links (http/https). */
export function splitLinks(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = []
  let last = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    parts.push({ text: match[0], href: match[0] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

export function tasksSummary(count: number, boardNames: string[]): string {
  return `${count} ${count === 1 ? 'tarea' : 'tareas'} → ${boardNames.join(', ')}`
}
