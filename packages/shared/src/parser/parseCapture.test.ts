import { describe, expect, it } from 'vitest'
import { LIMITS } from '../constants'
import { parseCapture } from './parseCapture'

const options = {
  currentBoardSlug: 'general',
  boards: [
    { slug: 'general', archived: false },
    { slug: 'pepito', archived: false },
    { slug: 'cafe-altamira', archived: false },
    { slug: 'viejo', archived: true },
  ],
}

const parse = (text: string) => parseCapture(text, options)

describe('parseCapture', () => {
  it('una línea es una tarea del tablero actual', () => {
    expect(parse('llamar al contador')).toEqual([
      { title: 'llamar al contador', boardSlug: 'general' },
    ])
  })

  it('@tablero la manda ahí y sale del título', () => {
    expect(parse('mandar presupuesto @pepito')).toEqual([
      { title: 'mandar presupuesto', boardSlug: 'pepito' },
    ])
    expect(parse('@Café-Altamira subir las fotos')).toEqual([
      { title: 'subir las fotos', boardSlug: 'cafe-altamira' },
    ])
  })

  it('un @ que no existe o está archivado queda en el título', () => {
    expect(parse('ver @nadie y @viejo')).toEqual([
      { title: 'ver @nadie y @viejo', boardSlug: 'general' },
    ])
  })

  it('un mail no es una mención', () => {
    expect(parse('escribirle a hola@pepito')).toEqual([
      { title: 'escribirle a hola@pepito', boardSlug: 'general' },
    ])
  })

  it('cada línea es una tarea, con su tablero, y las vacías no cuentan', () => {
    expect(parse('uno @pepito\n\n  \ndos\r\ntres')).toEqual([
      { title: 'uno', boardSlug: 'pepito' },
      { title: 'dos', boardSlug: 'general' },
      { title: 'tres', boardSlug: 'general' },
    ])
  })

  it('saca las viñetas y los corchetes del principio', () => {
    expect(
      parse(
        ['- uno', '* dos', '• tres', '[] cuatro', '[ ] cinco', '[x] seis', '- [ ] siete'].join(
          '\n',
        ),
      ).map((task) => task.title),
    ).toEqual(['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete'])
  })

  it('no toca lo que solo se parece a una viñeta', () => {
    expect(parse('-5 grados\n*importante*').map((task) => task.title)).toEqual([
      '-5 grados',
      '*importante*',
    ])
  })

  it('una viñeta o una mención sola no es nada', () => {
    expect(parse('-\n[ ]\n•\n@pepito')).toEqual([])
  })

  it(`corta los títulos en ${LIMITS.taskTitle} caracteres`, () => {
    const [task] = parse('a'.repeat(LIMITS.taskTitle + 50))
    expect(task?.title).toHaveLength(LIMITS.taskTitle)
  })
})
