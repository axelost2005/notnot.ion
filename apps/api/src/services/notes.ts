import type { CreateNoteInput, Note, NotesPage } from '@notnot/shared'
import { LIMITS, parseNote, positionsBetween, sortByPosition } from '@notnot/shared'
import { prisma } from '../db'
import type * as Db from '../generated/prisma/client'
import { badRequest, conflict, notFound } from '../middleware/errors'

type NoteWithTasks = Db.Note & { tasks: Db.Task[] }

function toNote(note: NoteWithTasks): Note {
  return {
    id: note.id,
    boardId: note.boardId,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    tasks: note.tasks
      .filter((task) => task.noteLine !== null)
      .sort((a, b) => a.noteLine! - b.noteLine!)
      .map((task) => ({
        id: task.id,
        noteLine: task.noteLine!,
        title: task.title,
        boardId: task.boardId,
        done: task.completedAt !== null,
      })),
  }
}

/** Página de notas, de la más nueva a la más vieja. `before` es el id de la última que ya se vio. */
export async function listNotes(boardId: string, before?: string): Promise<NotesPage> {
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } })
  if (!board) throw notFound('El tablero no existe')

  const notes = await prisma.note.findMany({
    where: { boardId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: LIMITS.notesPerPage + 1,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    include: { tasks: true },
  })
  const page = notes.slice(0, LIMITS.notesPerPage)
  return {
    notes: page.map(toNote),
    nextCursor: notes.length > LIMITS.notesPerPage ? (page.at(-1)?.id ?? null) : null,
  }
}

/**
 * Crea la nota y sus tareas en una sola escritura (todo o nada). El parser es el de `shared`:
 * la API es la autoridad. Cada tarea va al final de la primera columna normal de su tablero.
 */
export async function createNote({ boardId, content }: CreateNoteInput): Promise<Note> {
  const boards = await prisma.board.findMany({ select: { id: true, slug: true, archivedAt: true } })
  const current = boards.find((b) => b.id === boardId)
  if (!current) throw notFound('El tablero no existe')

  const { tasks } = parseNote(content, {
    currentBoardSlug: current.slug,
    boards: boards.map((b) => ({ slug: b.slug, archived: b.archivedAt !== null })),
  })
  if (tasks.length > LIMITS.tasksPerNote) {
    throw badRequest(`Una nota puede crear hasta ${LIMITS.tasksPerNote} tareas`)
  }

  const boardIdBySlug = new Map(boards.map((b) => [b.slug, b.id]))
  const targetIds = [...new Set(tasks.map((t) => boardIdBySlug.get(t.boardSlug)!))]
  const columns = targetIds.length
    ? await prisma.column.findMany({
        where: { boardId: { in: targetIds }, isDone: false },
        include: { tasks: { select: { position: true } } },
      })
    : []

  // Por tablero destino: su primera columna normal y las posiciones nuevas, en orden de línea.
  const slots = new Map<string, { columnId: string; positions: string[] }>()
  for (const targetId of targetIds) {
    const column = sortByPosition(columns.filter((c) => c.boardId === targetId))[0]
    if (!column) throw conflict('Un tablero destino no tiene columnas para tareas')
    const count = tasks.filter((t) => boardIdBySlug.get(t.boardSlug) === targetId).length
    const last = sortByPosition(column.tasks).at(-1)?.position ?? null
    slots.set(targetId, { columnId: column.id, positions: positionsBetween(last, null, count) })
  }

  const note = await prisma.note.create({
    data: {
      boardId,
      content,
      tasks: {
        create: tasks.map((task) => {
          const targetId = boardIdBySlug.get(task.boardSlug)!
          const slot = slots.get(targetId)!
          return {
            boardId: targetId,
            columnId: slot.columnId,
            title: task.title,
            noteLine: task.line,
            position: slot.positions.shift()!,
          }
        }),
      },
    },
    include: { tasks: true },
  })
  return toNote(note)
}

/** Las tareas quedan: pierden el vínculo con la nota. */
export async function deleteNote(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.task.updateMany({ where: { noteId: id }, data: { noteId: null, noteLine: null } }),
    prisma.note.delete({ where: { id } }),
  ])
}
