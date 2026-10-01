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
  createdAt: string
  updatedAt: string
}

export type BoardDetail = Board & {
  columns: Column[]
  tasks: Task[]
}

export type ApiErrorBody = {
  error: { code: string; message: string }
}
