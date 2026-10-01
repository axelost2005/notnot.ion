export const LIMITS = {
  boardName: 40,
  columnName: 40,
  taskTitle: 200,
  taskDescription: 5000,
  noteContent: 5000,
  tasksPerNote: 50,
  notesPerPage: 50,
  historyPerPage: 50,
  imagesPerTask: 20,
  /** La web las achica antes de subirlas: el lado más largo queda en esto como mucho. */
  imageMaxSide: 2000,
  /** Por pedido. Las funciones de Vercel aceptan hasta 4,5 MB. */
  imageBytes: 4 * 1024 * 1024,
  folderName: 60,
  pageTitle: 200,
  pageContent: 50_000,
} as const

/** Formatos que acepta la API (la web los convierte a WebP, o a JPEG si el navegador no puede). */
export const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const

export type ImageType = (typeof IMAGE_TYPES)[number]

/**
 * La web manda en cada pedido la medianoche de hoy en el dispositivo (ISO). Con eso la API
 * pasa al historial lo que se terminó antes.
 */
export const DAY_START_HEADER = 'X-Day-Start'

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

/** El tablero que está siempre: arriba de todo, con las tarjetas de todos los tableros. */
export const GENERAL = { name: 'General', slug: 'general', color: 'gray' } as const satisfies {
  name: string
  slug: string
  color: BoardColor
}
