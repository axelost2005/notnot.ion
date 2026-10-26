/** El cuadrado de cada sección: el panel sale de ahí y vuelve ahí. */
export const tileSelector = (tile: string) => `[data-tile="${CSS.escape(tile)}"]`

/** Abrir desde el Inicio: al cerrar, "atrás" vuelve justo al Inicio (ver `HomeLayout`). */
export const FROM_HOME = { fromHome: true }
