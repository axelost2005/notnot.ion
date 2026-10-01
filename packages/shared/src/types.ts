import type { BoardColor } from './constants'

// Respuestas de la API. Las fechas viajan como string ISO.

export type Board = {
  id: string
  name: string
  slug: string
  color: BoardColor
  position: string
  isInbox: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type BoardSummary = Board & {
  openTaskCount: number
}

export type Column = {
  id: string
  boardId: string
  name: string
  position: string
  isDone: boolean
}

export type Task = {
  id: string
  boardId: string
  columnId: string
  title: string
  description: string | null
  position: string
  completedAt: string | null
  noteId: string | null
  noteLine: number | null
  /** Tablero donde está la nota de origen (puede ser otro). */
  noteBoardId: string | null
  createdAt: string
  updatedAt: string
}

export type BoardDetail = Board & {
  columns: Column[]
  tasks: Task[]
}

/** Tarea que salió de una línea de la nota, con su estado actual. */
export type NoteTask = {
  id: string
  noteLine: number
  /** El título actual de la tarjeta (puede haber cambiado desde que se escribió). */
  title: string
  boardId: string
  done: boolean
}

export type Note = {
  id: string
  boardId: string
  content: string
  createdAt: string
  tasks: NoteTask[]
}

/** De la más nueva a la más vieja. `nextCursor` pide la página anterior. */
export type NotesPage = {
  notes: Note[]
  nextCursor: string | null
}

export type ApiErrorBody = {
  error: { code: string; message: string }
}
