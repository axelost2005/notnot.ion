import type { MoveTaskInput, Task } from '@notnot/shared'
import {
  isValidSlot,
  positionAfterLast,
  positionBeforeFirst,
  positionForSlot,
  sortByPosition,
} from '@notnot/shared'
import { prisma } from '../db'
import { badRequest, conflict, notFound } from '../middleware/errors'
import { taskInclude, toTask } from './boards'
import { deleteBlobs, imagePathnames } from './images'

type NewTask = { columnId: string; title: string; description?: string | null }
type TaskChanges = { title?: string; description?: string | null }

/** Al final de la columna. Si es la de terminadas, ya nace terminada. */
export async function createTask(input: NewTask): Promise<Task> {
  const column = await prisma.column.findUnique({
    where: { id: input.columnId },
    include: { tasks: { select: { position: true } } },
  })
  if (!column) throw notFound('La columna no existe')

  const task = await prisma.task.create({
    data: {
      boardId: column.boardId,
      columnId: column.id,
      title: input.title,
      description: input.description ?? null,
      position: positionAfterLast(column.tasks),
      completedAt: column.isDone ? new Date() : null,
    },
    include: taskInclude,
  })
  return toTask(task)
}

export async function updateTask(id: string, changes: TaskChanges): Promise<Task> {
  const task = await prisma.task.update({
    where: { id },
    data: { title: changes.title, description: changes.description },
    include: taskInclude,
  })
  return toTask(task)
}

export async function deleteTask(id: string): Promise<void> {
  const images = await imagePathnames({ taskId: id })
  await prisma.task.delete({ where: { id } })
  await deleteBlobs(images)
}

/**
 * Mueve la tarjeta entre `prevId` y `nextId` de la columna destino (puede ser de otro
 * tablero). Solo se actualiza esta fila.
 */
export async function moveTask(id: string, input: MoveTaskInput): Promise<Task> {
  const slot = { prevId: input.prevId ?? null, nextId: input.nextId ?? null }
  if (slot.prevId === id || slot.nextId === id) {
    throw badRequest('Una tarjeta no puede ser su propio vecino')
  }

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) throw notFound('La tarjeta no existe')

  const column = await prisma.column.findUnique({ where: { id: input.columnId } })
  if (!column) throw notFound('La columna no existe')
  if (input.boardId !== undefined && input.boardId !== column.boardId) {
    throw badRequest('La columna no es de ese tablero')
  }

  // Los vecinos son los que se ven: las del historial siguen en la columna pero no cuentan.
  const siblings = await prisma.task.findMany({
    where: { columnId: column.id, id: { not: id }, archivedAt: null },
    select: { id: true, position: true },
  })
  if (!isValidSlot(siblings, slot)) {
    throw conflict('El tablero cambió mientras movías la tarjeta. Probá de nuevo.')
  }

  const moved = await prisma.task.update({
    where: { id },
    data: {
      boardId: column.boardId,
      columnId: column.id,
      position: positionForSlot(siblings, slot),
      // Se marca al entrar a la de terminadas y se limpia al salir.
      completedAt: column.isDone ? (task.completedAt ?? new Date()) : null,
      // Moverla la saca del historial.
      archivedAt: null,
    },
    include: taskInclude,
  })
  return toTask(moved)
}

/**
 * Tildar: al final de la columna de terminadas. Destildar: arriba de la primera columna
 * normal (vuelve a quedar a la vista, aunque estuviera en el historial).
 */
export async function toggleTaskDone(id: string): Promise<Task> {
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) throw notFound('La tarjeta no existe')
  // Lo mismo que muestra la nota. Una del historial puede haber quedado en una columna que
  // dejó de ser la de terminadas, pero sigue terminada.
  const done = task.completedAt !== null

  const columns = await prisma.column.findMany({
    where: { boardId: task.boardId },
    include: { tasks: { where: { id: { not: id } }, select: { position: true } } },
  })
  const target = done
    ? sortByPosition(columns.filter((c) => !c.isDone))[0]
    : columns.find((c) => c.isDone)
  if (!target) throw conflict('Al tablero le falta la columna para moverla')

  const updated = await prisma.task.update({
    where: { id },
    data: done
      ? {
          columnId: target.id,
          position: positionBeforeFirst(target.tasks),
          completedAt: null,
          archivedAt: null,
        }
      : {
          columnId: target.id,
          position: positionAfterLast(target.tasks),
          completedAt: new Date(),
          archivedAt: null,
        },
    include: taskInclude,
  })
  return toTask(updated)
}
