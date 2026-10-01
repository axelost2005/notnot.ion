const COMBINING_MARKS = /[̀-ͯ]/g

export const FALLBACK_SLUG = 'tablero'

/** Minúsculas y sin acentos: la forma en la que se comparan nombres y slugs. */
export function normalizeForMatch(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
}

export function slugify(value: string): string {
  const slug = normalizeForMatch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || FALLBACK_SLUG
}

/** Si `base` ya está tomado prueba `base-2`, `base-3`… */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
