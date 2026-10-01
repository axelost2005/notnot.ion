export const LIMITS = {
  boardName: 40,
  columnName: 40,
  taskTitle: 200,
  taskDescription: 5000,
  noteContent: 5000,
  tasksPerNote: 50,
  notesPerPage: 50,
} as const

/** Paleta fija de tableros. Los valores de color viven en la web. */
export const BOARD_COLORS = [
  'gray',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'violet',
] as const

export type BoardColor = (typeof BOARD_COLORS)[number]

export function isBoardColor(value: string): value is BoardColor {
  return (BOARD_COLORS as readonly string[]).includes(value)
}

export const DEFAULT_COLUMNS = [
  { name: 'Por hacer', isDone: false },
  { name: 'En curso', isDone: false },
  { name: 'Hecho', isDone: true },
] as const

export const INBOX = { name: 'Inbox', slug: 'inbox', color: 'gray' } as const satisfies {
  name: string
  slug: string
  color: BoardColor
}
