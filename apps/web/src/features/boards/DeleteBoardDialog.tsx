import type { BoardSummary } from '@notnot/shared'
import type { MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteBoard } from './api'

type Props = {
  board: BoardSummary
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteBoardDialog({ board, open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const { slug } = useParams()
  const remove = useDeleteBoard()

  function onConfirm(event: MouseEvent) {
    // Se cierra cuando termina, no al toque: si falla, el diálogo sigue abierto.
    event.preventDefault()
    remove.mutate(board.id, {
      onSuccess: () => {
        onOpenChange(false)
        if (slug === board.slug) void navigate('/', { replace: true })
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar «{board.name}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borran sus columnas, tarjetas y notas. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={remove.isPending}>
            {remove.isPending ? 'Borrando…' : 'Borrar tablero'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
