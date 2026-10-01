import type { Lane } from '@notnot/shared'

/** El título de cada columna lleva el color de su rol: por hacer, en curso o terminadas. */
export const laneTitleClass: Record<Lane, string> = {
  todo: 'text-status-todo',
  doing: 'text-status-doing',
  done: 'text-status-done',
}
