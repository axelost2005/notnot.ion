import { describe, expect, it } from 'vitest'
import { FALLBACK_SLUG, normalizeForMatch, slugify, uniqueSlug } from './slug'

describe('slugify', () => {
  it.each([
    ['Pepito Pérez', 'pepito-perez'],
    ['Personal', 'personal'],
    ['  Hola   Mundo  ', 'hola-mundo'],
    ['Ñandú Diseño', 'nandu-diseno'],
    ['ÁÉÍÓÚ Ü', 'aeiou-u'],
    ['Diseño & Co.', 'diseno-co'],
    ['Cliente_ABC 2026', 'cliente-abc-2026'],
    ['a--b', 'a-b'],
    ['-Inbox-', 'inbox'],
    ['Crème brûlée', 'creme-brulee'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected)
  })

  it('usa un slug de respaldo si no queda nada', () => {
    expect(slugify('🚀')).toBe(FALLBACK_SLUG)
    expect(slugify('---')).toBe(FALLBACK_SLUG)
    expect(slugify('   ')).toBe(FALLBACK_SLUG)
  })

  it('es idempotente', () => {
    expect(slugify(slugify('Pepito Pérez'))).toBe('pepito-perez')
  })
})

describe('normalizeForMatch', () => {
  it('ignora mayúsculas y acentos', () => {
    expect(normalizeForMatch('PÉPITO')).toBe('pepito')
    expect(normalizeForMatch('Ñandú')).toBe('nandu')
  })
})

describe('uniqueSlug', () => {
  it('devuelve el slug tal cual si está libre', () => {
    expect(uniqueSlug('pepito', ['inbox'])).toBe('pepito')
  })

  it('agrega -2 si choca', () => {
    expect(uniqueSlug('pepito', ['pepito'])).toBe('pepito-2')
  })

  it('sigue con -3, -4… hasta encontrar uno libre', () => {
    expect(uniqueSlug('pepito', ['pepito', 'pepito-2', 'pepito-3'])).toBe('pepito-4')
  })

  it('no se confunde con slugs parecidos', () => {
    expect(uniqueSlug('pepito', ['pepito-2'])).toBe('pepito')
  })
})
