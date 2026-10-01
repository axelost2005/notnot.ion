import { readStorage, writeStorage } from '@/lib/storage'

const draftKey = (boardId: string) => `notnot:draft:${boardId}`

export const readDraft = (boardId: string) => readStorage(draftKey(boardId)) ?? ''
export const writeDraft = (boardId: string, text: string) =>
  writeStorage(draftKey(boardId), text.trim() ? text : null)

const PANEL_KEY = 'notnot:notes-open'

export const readPanelOpen = () => readStorage(PANEL_KEY) !== 'false'
export const writePanelOpen = (open: boolean) => writeStorage(PANEL_KEY, String(open))
