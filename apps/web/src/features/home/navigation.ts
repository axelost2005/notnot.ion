import { createContext } from 'react'

/** El cuadrado de cada sección: el panel sale de ahí y vuelve ahí. */
export const tileSelector = (tile: string) => `[data-tile="${CSS.escape(tile)}"]`

/** Abierto desde la app: al cerrar, vuelve atrás hasta donde estaba (ver `TasksHome`). */
export const FROM_HOME = { fromHome: true }

/** Abre la barra en el celu (la hoja de `AppLayout`). */
export const MenuContext = createContext<(() => void) | null>(null)
