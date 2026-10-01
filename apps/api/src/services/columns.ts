import type { Column, CreateColumnInput, UpdateColumnInput } from '@notnot/shared'
import { positionAfterLast, positionBetween, sortByPosition } from '@notnot/shared'
import { prisma } from '../db'
import { conflict, notFound } from '../middleware/errors'
import { toColumn } from './boards'

/** Si la de terminadas es la última, la nueva va justo antes; si no, al final. */
export async function createColumn(boardId: string, input: CreateColumnInput): Promise<Column> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { columns: true },
  })
  if (!board) throw notFound('El tablero no existe')

  const columns = sortByPosition(board.columns)
  const last = columns.at(-1)
  const position = last?.isDone
    ? positionBetween(columns.at(-2)?.position ?? null, last.position)
    : positionAfterLast(columns)

  const column = await prisma.column.create({ data: { boardId, name: input.name, position } })
  return toColumn(column)
}

export async function updateColumn(id: string, input: UpdateColumnInput): Promise<Column> {
  const column = await prisma.column.findUnique({ where: { id } })
  if (!column) throw notFound('La columna no existe')

  if (input.isDone && !column.isDone) {
    // Cambia la de terminadas: las tarjetas de la vieja se reabren y las de la nueva se terminan.
    // Las del historial no se tocan: siguen terminadas aunque su columna ya no sea esa.
    const now = new Date()
    await prisma.$transaction([
      prisma.task.updateMany({
        where: { boardId: column.boardId, column: { isDone: true }, archivedAt: null },
        data: { completedAt: null },
      }),
      prisma.column.updateMany({
        where: { boardId: column.boardId, isDone: true },
        data: { isDone: false },
      }),
      prisma.task.updateMany({
        where: { columnId: id, completedAt: null },
        data: { completedAt: now },
      }),
      prisma.column.update({ where: { id }, data: { isDone: true, name: input.name } }),
    ])
  } else if (input.name !== undefined) {
    await prisma.column.update({ where: { id }, data: { name: input.name } })
  }

  return toColumn(await prisma.column.findUniqueOrThrow({ where: { id } }))
}

/** Solo vacías (a la vista), nunca la de terminadas ni la última normal. */
export async function deleteColumn(id: string): Promise<void> {
  const column = await prisma.column.findUnique({
    where: { id },
    include: { _count: { select: { tasks: { where: { archivedAt: null } } } } },
  })
  if (!column) throw notFound('La columna no existe')
  if (column.isDone) throw conflict('Es la columna de terminadas: elegí otra antes de borrarla')
  if (column._count.tasks > 0) throw conflict('La columna tiene tarjetas: movelas o borralas antes')

  const columns = await prisma.column.findMany({ where: { boardId: column.boardId } })
  if (columns.filter((c) => !c.isDone).length <= 1)
    throw conflict('El tablero necesita al menos una columna además de la de terminadas')
  const done = columns.find((c) => c.isDone)
  if (!done) throw conflict('Al tablero le falta la columna de terminadas')

  await prisma.$transaction([
    // Las del historial pueden haber quedado acá (si antes era la de terminadas): no se pierden.
    prisma.task.updateMany({ where: { columnId: id }, data: { columnId: done.id } }),
    prisma.column.delete({ where: { id } }),
  ])
}
