import type { BoardColor } from '@notnot/shared'
import type { CSSProperties } from 'react'

export const COLOR_LABELS: Record<BoardColor, string> = {
  gray: 'Gris',
  red: 'Rojo',
  orange: 'Naranja',
  amber: 'Ámbar',
  green: 'Verde',
  teal: 'Turquesa',
  blue: 'Azul',
  violet: 'Violeta',
}

/** Expone el color del tablero como `--board` para usarlo con `bg-(--board)`, etc. */
export function boardStyle(color: BoardColor): CSSProperties & { '--board': string } {
  return { '--board': `var(--board-${color})` }
}
