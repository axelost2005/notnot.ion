import { describe, expect, it } from 'vitest'
import { hasTaskMarker, parseNote, type ParsedLine } from './parseNote'

const boards = [
  { slug: 'inbox', archived: false },
  { slug: 'pepito-perez', archived: false },
  { slug: 'personal', archived: false },
  { slug: 'viejo', archived: true },
]

const parse = (content: string, currentBoardSlug = 'inbox') =>
  parseNote(content, { currentBoardSlug, boards })

const tasks = (content: string, currentBoardSlug = 'inbox') =>
  parse(content, currentBoardSlug).lines.filter((line) => line.type === 'task')

describe('marcadores', () => {
  it.each(['[] llamar', '[ ] llamar', '- [] llamar', '- [ ] llamar', '* [ ] llamar'])(
    '"%s" es tarea',
    (line) => {
      expect(tasks(line)).toEqual([
        { type: 'task', line: 0, text: line, title: 'llamar', boardSlug: 'inbox' },
      ])
    },
  )

  it('ignora los espacios del principio', () => {
    expect(tasks('    [] llamar')[0]?.title).toBe('llamar')
    expect(tasks('\t- [ ] llamar')[0]?.title).toBe('llamar')
  })

  it('no necesita espacio después del marcador', () => {
    expect(tasks('[]llamar')[0]?.title).toBe('llamar')
  })

  it.each([
    'llamar []',
    '[x] llamar',
    '[  ] llamar',
    '-[] llamar',
    '* [] llamar',
    '+ [ ] llamar',
    'llamar',
  ])('"%s" no es tarea', (line) => {
    expect(tasks(line)).toEqual([])
  })

  it('el resto de la línea es el título, sin espacios de más', () => {
    expect(tasks('[]   llamar   al   cliente  ')[0]?.title).toBe('llamar al cliente')
  })
})

describe('títulos', () => {
  it('si el título queda vacío, la línea es texto', () => {
    expect(parse('[]').lines).toEqual([{ type: 'text', line: 0, text: '[]' }])
    expect(parse('- [ ]    ').lines[0]?.type).toBe('text')
  })

  it('si solo había una mención válida, la línea es texto', () => {
    expect(parse('[] @pepito-perez').lines[0]?.type).toBe('text')
  })

  it('corta los títulos de más de 200 caracteres', () => {
    const title = tasks(`[] ${'a'.repeat(250)}`)[0]?.title
    expect(title).toHaveLength(200)
  })

  it('no corta títulos de exactamente 200', () => {
    expect(tasks(`[] ${'a'.repeat(200)}`)[0]?.title).toHaveLength(200)
  })
})

describe('menciones', () => {
  it('@slug manda la tarea a ese tablero y sale del título', () => {
    expect(tasks('[] llamar al cliente @pepito-perez')[0]).toMatchObject({
      title: 'llamar al cliente',
      boardSlug: 'pepito-perez',
    })
  })

  it('la mención puede estar en el medio', () => {
    expect(tasks('[] llamar @pepito-perez mañana')[0]).toMatchObject({
      title: 'llamar mañana',
      boardSlug: 'pepito-perez',
    })
  })

  it('sin @ va al tablero actual', () => {
    expect(tasks('[] llamar', 'personal')[0]?.boardSlug).toBe('personal')
  })

  it('compara sin mayúsculas ni acentos', () => {
    expect(tasks('[] llamar @Pepito-Pérez')[0]?.boardSlug).toBe('pepito-perez')
    expect(tasks('[] llamar @PERSONAL')[0]?.boardSlug).toBe('personal')
  })

  it('un @ que no existe queda como texto y va al tablero actual', () => {
    expect(tasks('[] llamar @juancito')[0]).toMatchObject({
      title: 'llamar @juancito',
      boardSlug: 'inbox',
    })
  })

  it('un @ de un tablero archivado queda como texto', () => {
    expect(tasks('[] llamar @viejo')[0]).toMatchObject({
      title: 'llamar @viejo',
      boardSlug: 'inbox',
    })
  })

  it('si hay varios, gana el primero válido y los demás quedan como texto', () => {
    expect(tasks('[] llamar @juancito @personal @pepito-perez')[0]).toMatchObject({
      title: 'llamar @juancito @pepito-perez',
      boardSlug: 'personal',
    })
  })

  it('la misma mención repetida: sale solo la primera', () => {
    expect(tasks('[] @personal llamar @personal')[0]).toMatchObject({
      title: 'llamar @personal',
      boardSlug: 'personal',
    })
  })

  it('un mail no es una mención', () => {
    expect(tasks('[] escribirle a juan@personal.com')[0]).toMatchObject({
      title: 'escribirle a juan@personal.com',
      boardSlug: 'inbox',
    })
  })

  it('la puntuación pegada no es parte del slug', () => {
    expect(tasks('[] llamar a @personal, urgente')[0]).toMatchObject({
      title: 'llamar a , urgente',
      boardSlug: 'personal',
    })
  })

  it('las menciones en líneas de texto no hacen nada', () => {
    expect(parse('hablé con @pepito-perez').lines).toEqual([
      { type: 'text', line: 0, text: 'hablé con @pepito-perez' },
    ])
  })
})

describe('notas de varias líneas', () => {
  it('numera las líneas desde 0 y mezcla texto y tareas', () => {
    const content =
      'Reunión con Pepito\n\n[] mandar presupuesto @pepito-perez\nquedamos el jueves\n- [ ] comprar yerba'
    expect(parse(content).lines).toEqual<ParsedLine[]>([
      { type: 'text', line: 0, text: 'Reunión con Pepito' },
      { type: 'text', line: 1, text: '' },
      {
        type: 'task',
        line: 2,
        text: '[] mandar presupuesto @pepito-perez',
        title: 'mandar presupuesto',
        boardSlug: 'pepito-perez',
      },
      { type: 'text', line: 3, text: 'quedamos el jueves' },
      {
        type: 'task',
        line: 4,
        text: '- [ ] comprar yerba',
        title: 'comprar yerba',
        boardSlug: 'inbox',
      },
    ])
  })

  it('acepta saltos de línea de Windows', () => {
    expect(parse('[] uno\r\n[] dos').lines.map((l) => l.type === 'task' && l.title)).toEqual([
      'uno',
      'dos',
    ])
  })

  it('una nota vacía no tiene tareas', () => {
    expect(tasks('')).toEqual([])
  })
})

describe('hasTaskMarker', () => {
  it('detecta el marcador aunque no haya tarea', () => {
    expect(hasTaskMarker('  - [ ] algo')).toBe(true)
    expect(hasTaskMarker('algo')).toBe(false)
  })
})
