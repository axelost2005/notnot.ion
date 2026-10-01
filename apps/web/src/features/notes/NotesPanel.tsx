import type { BoardSummary } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { boardsQuery } from '../boards/api'
import { NoteComposer } from './NoteComposer'
import { NotesList } from './NotesList'

type Props = {
  board: BoardSummary
  className?: string
  autoFocus?: boolean
}

export function NotesPanel({ board, className, autoFocus }: Props) {
  const boards = useQuery(boardsQuery)
  const list = boards.data ?? [board]

  return (
    <aside aria-label="Notas" className={cn('flex min-h-0 flex-col bg-background', className)}>
      <h2 className="sr-only">Notas de {board.name}</h2>
      <NotesList board={board} boards={list} />
      <NoteComposer key={board.id} board={board} boards={list} autoFocus={autoFocus} />
    </aside>
  )
}
