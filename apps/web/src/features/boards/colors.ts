import type { BoardColor } from '@notnot/shared'
import type { CSSProperties } from 'react'

export const COLOR_LABELS: Record<BoardColor, string> = {
  gray: 'Gris',
  brown: 'Marrón',
  red: 'Rojo',
  orange: 'Naranja',
  amber: 'Ámbar',
  yellow: 'Amarillo',
  lime: 'Lima',
  green: 'Verde',
  teal: 'Turquesa',
  sky: 'Celeste',
  blue: 'Azul',
  violet: 'Violeta',
  fuchsia: 'Fucsia',
  pink: 'Rosa',
}

/** Expone el color del tablero como `--board` para usarlo con `bg-(--board)`, etc. */
export function boardStyle(color: BoardColor): CSSProperties & { '--board': string } {
  return { '--board': `var(--board-${color})` }
}
