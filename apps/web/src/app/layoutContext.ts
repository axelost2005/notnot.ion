import { useOutletContext } from 'react-router'

export type LayoutContext = {
  /** Abre la lista de tableros (en mobile vive en un panel lateral). */
  openBoardsMenu: () => void
}

export const useLayout = () => useOutletContext<LayoutContext>()
