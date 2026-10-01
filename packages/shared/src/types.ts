import type { BoardColor } from './constants'

// Respuestas de la API. Las fechas viajan como string ISO.

export type Board = {
  id: string
  name: string
  slug: string
  color: BoardColor
  position: string
  isGeneral: boolean
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

/** Imagen privada adjunta (se sirve en `/api/images/:id`). Las medidas sirven para el visor. */
export type ImageInfo = {
  id: string
  width: number
  height: number
}

export type Task = {
  id: string
  boardId: string
  columnId: string
  title: string
  description: string | null
  position: string
  completedAt: string | null
  /** Terminada antes de hoy: está en el historial y no en el tablero. */
  archivedAt: string | null
  noteId: string | null
  noteLine: number | null
  /** Tablero donde está la nota de origen (puede ser otro). */
  noteBoardId: string | null
  /** De la más vieja a la más nueva. */
  images: ImageInfo[]
  createdAt: string
  updatedAt: string
}

export type BoardDetail = Board & {
  columns: Column[]
  tasks: Task[]
}

/** El kanban de General: las columnas y las tarjetas (sin archivar) de los tableros activos. */
export type GeneralBoard = {
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
  /** Está en el historial: no hay tarjeta para abrir en el tablero. */
  archived: boolean
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

/** Terminadas, de la más reciente a la más vieja. `nextCursor` pide la página anterior. */
export type HistoryPage = {
  tasks: Task[]
  nextCursor: string | null
}

export type ApiErrorBody = {
  error: { code: string; message: string }
}
