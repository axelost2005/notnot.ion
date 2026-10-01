import type { HistoryPage } from '@notnot/shared'
import { LIMITS } from '@notnot/shared'
import { prisma } from '../db'
import { notFound } from '../middleware/errors'
import { toTask, withNoteBoard } from './boards'

/** Las terminadas antes de `dayStart` (la medianoche del dispositivo) pasan al historial. */
export async function archiveDoneTasks(dayStart: Date): Promise<void> {
  await prisma.task.updateMany({
    where: { archivedAt: null, completedAt: { lt: dayStart } },
    data: { archivedAt: new Date() },
  })
}

/** De la más reciente a la más vieja. Sin `boardId`, las de todos los tableros. */
export async function listHistory(boardId?: string, before?: string): Promise<HistoryPage> {
  if (boardId) {
    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } })
    if (!board) throw notFound('El tablero no existe')
  }

  const tasks = await prisma.task.findMany({
    where: { archivedAt: { not: null }, ...(boardId ? { boardId } : {}) },
    orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
    take: LIMITS.historyPerPage + 1,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    include: withNoteBoard,
  })
  const page = tasks.slice(0, LIMITS.historyPerPage)
  return {
    tasks: page.map(toTask),
    nextCursor: tasks.length > LIMITS.historyPerPage ? (page.at(-1)?.id ?? null) : null,
  }
}
