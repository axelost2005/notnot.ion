import { describe, expect, it } from 'vitest'
import { canMoveFolder, compareNames, compareTitles, descendantFolderIds, folderPath } from './tree'

const folders = [
  { id: 'clientes', parentId: null, name: 'Clientes' },
  { id: 'pepito', parentId: 'clientes', name: 'Pepito' },
  { id: 'facturas', parentId: 'pepito', name: 'Facturas' },
  { id: 'ideas', parentId: null, name: 'Ideas' },
]

describe('compareNames', () => {
  it('ordena en castellano, sin mayúsculas ni acentos y con números naturales', () => {
    expect(['Zeta', 'árbol', 'Bote', 'nota 10', 'Nota 2'].sort(compareNames)).toEqual([
      'árbol',
      'Bote',
      'Nota 2',
      'nota 10',
      'Zeta',
    ])
  })

  it('las notas sin título van al final', () => {
    expect(['', 'Bote', '', 'Ancla'].sort(compareTitles)).toEqual(['Ancla', 'Bote', '', ''])
  })
})

describe('descendantFolderIds', () => {
  it('junta las carpetas de adentro a cualquier profundidad', () => {
    expect(descendantFolderIds(folders, 'clientes')).toEqual(new Set(['pepito', 'facturas']))
    expect(descendantFolderIds(folders, 'facturas')).toEqual(new Set())
  })

  it('no se cuelga con datos circulares', () => {
    const loop = [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ]
    expect(descendantFolderIds(loop, 'a')).toEqual(new Set(['b', 'a']))
  })
})

describe('canMoveFolder', () => {
  it('a la raíz o a otra rama, sí', () => {
    expect(canMoveFolder(folders, 'pepito', null)).toBe(true)
    expect(canMoveFolder(folders, 'pepito', 'ideas')).toBe(true)
    expect(canMoveFolder(folders, 'facturas', 'clientes')).toBe(true)
  })

  it('adentro de sí misma o de una de las suyas, no', () => {
    expect(canMoveFolder(folders, 'clientes', 'clientes')).toBe(false)
    expect(canMoveFolder(folders, 'clientes', 'pepito')).toBe(false)
    expect(canMoveFolder(folders, 'clientes', 'facturas')).toBe(false)
  })
})

describe('folderPath', () => {
  it('de la raíz a la carpeta', () => {
    expect(folderPath(folders, 'facturas').map((f) => f.name)).toEqual([
      'Clientes',
      'Pepito',
      'Facturas',
    ])
    expect(folderPath(folders, null)).toEqual([])
    expect(folderPath(folders, 'no-existe')).toEqual([])
  })
})
