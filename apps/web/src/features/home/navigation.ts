import { createContext } from 'react'

/** El cuadrado de cada sección: el panel sale de ahí y vuelve ahí. */
export const tileSelector = (tile: string) => `[data-tile="${CSS.escape(tile)}"]`

/** Abierto desde la app: al cerrar, vuelve atrás hasta donde estaba (ver `TasksHome`). */
export const FROM_HOME = { fromHome: true }

/** Abierto desde fuera de la grilla (Hoy): el panel aparece en su lugar, sin salir de un cuadrado. */
export const FROM_OUTSIDE = { fromHome: true, outside: true }

/** Abre la barra en el celu (la hoja de `AppLayout`). */
export const MenuContext = createContext<(() => void) | null>(null)
