import type { BoardSummary } from '@notnot/shared'
import { Archive, ArchiveRestore, Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateBoard } from './api'
import { BoardFormDialog } from './BoardFormDialog'
import { DeleteBoardDialog } from './DeleteBoardDialog'

export function BoardActionsMenu({ board }: { board: BoardSummary }) {
  const update = useUpdateBoard()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const archived = board.archivedAt !== null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Opciones de ${board.name}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil />
            {board.isInbox ? 'Cambiar color' : 'Editar nombre y color'}
          </DropdownMenuItem>
          {!board.isInbox && (
            <>
              <DropdownMenuItem
                onSelect={() => update.mutate({ id: board.id, archived: !archived })}
              >
                {archived ? <ArchiveRestore /> : <Archive />}
                {archived ? 'Desarchivar' : 'Archivar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                <Trash2 />
                Borrar…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <BoardFormDialog open={editing} onOpenChange={setEditing} board={board} />
      {!board.isInbox && (
        <DeleteBoardDialog board={board} open={deleting} onOpenChange={setDeleting} />
      )}
    </>
  )
}
