import { readStorage, writeStorage } from '@/lib/storage'

const draftKey = (boardId: string) => `notnot:draft:${boardId}`

export const readDraft = (boardId: string) => readStorage(draftKey(boardId)) ?? ''
export const writeDraft = (boardId: string, text: string) =>
  writeStorage(draftKey(boardId), text.trim() ? text : null)

const PANEL_KEY = 'notnot:notes-open'

/** Sin preferencia guardada, abierto solo si hay lugar (en tablet aprieta el tablero). */
export function readPanelOpen() {
  const stored = readStorage(PANEL_KEY)
  if (stored === null) return window.matchMedia('(min-width: 1280px)').matches
  return stored !== 'false'
}
export const writePanelOpen = (open: boolean) => writeStorage(PANEL_KEY, String(open))
