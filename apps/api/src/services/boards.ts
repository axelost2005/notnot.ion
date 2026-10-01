import type {
  Board,
  BoardDetail,
  BoardSummary,
  Column,
  CreateBoardInput,
  Task,
  UpdateBoardInput,
} from '@notnot/shared'
import {
  DEFAULT_COLUMNS,
  isBoardColor,
  positionAfterLast,
  positionsBetween,
  slugify,
  sortByPosition,
  uniqueSlug,
} from '@notnot/shared'
import { prisma } from '../db'
import type * as Db from '../generated/prisma/client'
import { conflict, notFound } from '../middleware/errors'

export function toBoard(board: Db.Board): Board {
  return {
    id: board.id,
    name: board.name,
    slug: board.slug,
    color: isBoardColor(board.color) ? board.color : 'gray',
    position: board.position,
    isInbox: board.isInbox,
    archivedAt: board.archivedAt?.toISOString() ?? null,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  }
}

export function toColumn(column: Db.Column): Column {
  return {
    id: column.id,
    boardId: column.boardId,
    name: column.name,
    position: column.position,
    isDone: column.isDone,
  }
}

export function toTask(task: Db.Task): Task {
  return {
    id: task.id,
    boardId: task.boardId,
    columnId: task.columnId,
    title: task.title,
    description: task.description,
    position: task.position,
    completedAt: task.completedAt?.toISOString() ?? null,
    noteId: task.noteId,
    noteLine: task.noteLine,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

const openTaskCount = { _count: { select: { tasks: { where: { completedAt: null } } } } } as const

/** Activos y archivados, Inbox primero, con la cantidad de tareas abiertas. */
export async function listBoards(): Promise<BoardSummary[]> {
  const boards = await prisma.board.findMany({ include: openTaskCount })
  return sortByPosition(boards)
    .sort((a, b) => Number(b.isInbox) - Number(a.isInbox))
    .map((board) => ({ ...toBoard(board), openTaskCount: board._count.tasks }))
}

async function getBoardSummary(id: string): Promise<BoardSummary> {
  const board = await prisma.board.findUnique({ where: { id }, include: openTaskCount })
  if (!board) throw notFound('El tablero no existe')
  return { ...toBoard(board), openTaskCount: board._count.tasks }
}

export async function getBoard(id: string): Promise<BoardDetail> {
  const board = await prisma.board.findUnique({
    where: { id },
    include: { columns: true, tasks: true },
  })
  if (!board) throw notFound('El tablero no existe')
  return {
    ...toBoard(board),
    columns: sortByPosition(board.columns).map(toColumn),
    tasks: sortByPosition(board.tasks).map(toTask),
  }
}

/** Crea el tablero al final de la lista, con las 3 columnas default. */
export async function createBoard(input: CreateBoardInput): Promise<BoardSummary> {
  const boards = await prisma.board.findMany({ select: { slug: true, position: true } })
  const columnPositions = positionsBetween(null, null, DEFAULT_COLUMNS.length)
  const board = await prisma.board.create({
    data: {
      name: input.name,
      slug: uniqueSlug(
        slugify(input.name),
        boards.map((b) => b.slug),
      ),
      color: input.color,
      position: positionAfterLast(boards),
      columns: {
        create: DEFAULT_COLUMNS.map((column, i) => ({ ...column, position: columnPositions[i]! })),
      },
    },
  })
  return { ...toBoard(board), openTaskCount: 0 }
}

export async function updateBoard(id: string, input: UpdateBoardInput): Promise<BoardSummary> {
  const board = await prisma.board.findUnique({ where: { id } })
  if (!board) throw notFound('El tablero no existe')
  if (board.isInbox && (input.name !== undefined || input.archived !== undefined)) {
    throw conflict('Inbox no se puede renombrar ni archivar')
  }

  const data: Db.Prisma.BoardUpdateInput = {}
  if (input.color !== undefined) data.color = input.color
  if (input.archived !== undefined) data.archivedAt = input.archived ? new Date() : null
  if (input.name !== undefined && input.name !== board.name) {
    // El slug se regenera al renombrar, sin chocar con el de los otros tableros.
    const others = await prisma.board.findMany({
      where: { id: { not: id } },
      select: { slug: true },
    })
    data.name = input.name
    data.slug = uniqueSlug(
      slugify(input.name),
      others.map((b) => b.slug),
    )
  }

  await prisma.board.update({ where: { id }, data })
  return getBoardSummary(id)
}

/** Borra en cascada columnas, tareas y notas. Inbox no se borra. */
export async function deleteBoard(id: string): Promise<void> {
  const board = await prisma.board.findUnique({ where: { id }, select: { isInbox: true } })
  if (!board) throw notFound('El tablero no existe')
  if (board.isInbox) throw conflict('Inbox no se puede borrar')
  await prisma.$transaction([
    // Las tareas de otros tableros que salieron de sus notas pierden el vínculo con la nota.
    prisma.task.updateMany({
      where: { note: { boardId: id } },
      data: { noteId: null, noteLine: null },
    }),
    prisma.board.delete({ where: { id } }),
  ])
}
