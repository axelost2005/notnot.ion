import {
  boardNameSchema,
  LIMITS,
  slugify,
  uniqueSlug,
  type BoardColor,
  type BoardSummary,
  type UpdateBoardInput,
} from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { boardsQuery, useCreateBoard, useUpdateBoard } from './api'
import { ColorPicker } from './ColorPicker'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si viene, edita ese tablero; si no, crea uno nuevo. */
  board?: BoardSummary
}

export function BoardFormDialog({ open, onOpenChange, board }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <BoardForm board={board} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function BoardForm({ board, onDone }: { board?: BoardSummary; onDone: () => void }) {
  const navigate = useNavigate()
  const { slug: currentSlug } = useParams()
  const boards = useQuery(boardsQuery)
  const create = useCreateBoard()
  const update = useUpdateBoard()
  const [name, setName] = useState(board?.name ?? '')
  const [color, setColor] = useState<BoardColor>(board?.color ?? 'blue')
  const [submitted, setSubmitted] = useState(false)

  const isInbox = board?.isInbox ?? false
  const parsed = boardNameSchema.safeParse(name)
  const nameError = submitted && !parsed.success ? parsed.error.issues[0]?.message : undefined
  const pending = create.isPending || update.isPending
  const otherSlugs = (boards.data ?? []).filter((b) => b.id !== board?.id).map((b) => b.slug)
  const mention = parsed.success ? uniqueSlug(slugify(parsed.data), otherSlugs) : null

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!parsed.success) return

    if (!board) {
      create.mutate(
        { name: parsed.data, color },
        {
          onSuccess: (created) => {
            onDone()
            void navigate(`/b/${created.slug}`)
          },
        },
      )
      return
    }

    const changes: UpdateBoardInput = {}
    if (!isInbox && parsed.data !== board.name) changes.name = parsed.data
    if (color !== board.color) changes.color = color
    if (Object.keys(changes).length === 0) return onDone()

    update.mutate(
      { id: board.id, ...changes },
      {
        onSuccess: (updated) => {
          onDone()
          if (currentSlug === board.slug && updated.slug !== board.slug) {
            void navigate(`/b/${updated.slug}`, { replace: true })
          }
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{board ? 'Editar tablero' : 'Nuevo tablero'}</DialogTitle>
        <DialogDescription>
          {board
            ? 'El nombre también cambia cómo lo mencionás desde las notas.'
            : 'Uno por cliente o categoría, con sus columnas, tarjetas y notas.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="board-name">Nombre</Label>
        <Input
          id="board-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={LIMITS.boardName}
          disabled={isInbox}
          autoFocus={!isInbox}
          autoComplete="off"
          aria-invalid={nameError ? true : undefined}
          aria-describedby="board-name-help"
        />
        <p
          id="board-name-help"
          role={nameError ? 'alert' : undefined}
          className={
            nameError ? 'text-[13px] text-destructive' : 'text-[13px] text-muted-foreground'
          }
        >
          {nameError ??
            (isInbox ? (
              'Inbox no se renombra.'
            ) : mention ? (
              <>
                En las notas: <span className="font-mono text-foreground">@{mention}</span>
              </>
            ) : (
              `Hasta ${LIMITS.boardName} caracteres.`
            ))}
        </p>
      </div>

      <ColorPicker value={color} onChange={setColor} />

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {board ? (pending ? 'Guardando…' : 'Guardar') : pending ? 'Creando…' : 'Crear tablero'}
        </Button>
      </DialogFooter>
    </form>
  )
}
