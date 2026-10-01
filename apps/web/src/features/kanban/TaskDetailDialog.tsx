import {
  LIMITS,
  sortByPosition,
  taskTitleSchema,
  type BoardDetail,
  type Task,
  type UpdateTaskInput,
} from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ImageGallery } from '@/components/images/ImageGallery'
import { useImageDrop } from '@/components/images/useImageDrop'
import { usePendingImages } from '@/components/images/usePendingImages'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { boardQuery, boardsQuery } from '../boards/api'
import { BoardSelect } from '../boards/BoardSelect'
import {
  useAddTaskImage,
  useDeleteTask,
  useDeleteTaskImage,
  useMoveTask,
  useUpdateTask,
} from './api'

type Props = {
  board: BoardDetail
  taskId: string | null
  onClose: () => void
}

export function TaskDetailDialog({ board, taskId, onClose }: Props) {
  const task = board.tasks.find((t) => t.id === taskId)

  return (
    <Dialog open={task !== undefined} onOpenChange={(open) => !open && onClose()}>
      {/* Sin padding propio: el formulario lo ocupa entero y recibe las imágenes que se sueltan. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-lg">
        {task && <TaskDetailForm key={task.id} board={board} task={task} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

const dateFormat = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })

function TaskDetailForm({
  board,
  task,
  onClose,
}: {
  board: BoardDetail
  task: Task
  onClose: () => void
}) {
  const boards = useQuery(boardsQuery)
  const update = useUpdateTask(board.id)
  const move = useMoveTask()
  const remove = useDeleteTask(board.id)
  const addImage = useAddTaskImage(task)
  const removeImage = useDeleteTaskImage(task)
  const uploads = usePendingImages((file, done) => addImage.mutate(file, { onSettled: done }))
  const roomForImages = LIMITS.imagesPerTask - task.images.length - uploads.pending.length
  // Con el botón, pegando (Ctrl+V) o soltándolas sobre el detalle.
  function addImages(files: File[]) {
    if (files.length > roomForImages) {
      toast.error(`Una tarjeta tiene hasta ${LIMITS.imagesPerTask} imágenes`)
    }
    uploads.add(files.slice(0, Math.max(0, roomForImages)))
  }
  const drop = useImageDrop(addImages)

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [targetBoardId, setTargetBoardId] = useState(task.boardId)
  const [targetColumnId, setTargetColumnId] = useState(task.columnId)
  const [titleError, setTitleError] = useState<string | null>(null)

  const otherBoard = useQuery({
    ...boardQuery(targetBoardId),
    enabled: targetBoardId !== board.id,
  })
  const targetColumns = sortByPosition(
    targetBoardId === board.id ? board.columns : (otherBoard.data?.columns ?? []),
  )
  // Al cambiar de tablero, la columna por defecto es la primera normal.
  const columnId = targetColumns.some((c) => c.id === targetColumnId)
    ? targetColumnId
    : (targetColumns.find((c) => !c.isDone)?.id ?? '')

  const activeBoards = (boards.data ?? []).filter((b) => b.archivedAt === null || b.id === board.id)
  // La nota de origen puede estar en otro tablero.
  const noteBoard = task.noteId ? boards.data?.find((b) => b.id === task.noteBoardId) : undefined
  const canMove = columnId !== '' && columnId !== task.columnId

  function onSave(event: FormEvent) {
    event.preventDefault()
    const parsedTitle = taskTitleSchema.safeParse(title)
    if (!parsedTitle.success) {
      setTitleError(parsedTitle.error.issues[0]?.message ?? 'Título inválido')
      return
    }

    const changes: UpdateTaskInput = {}
    if (parsedTitle.data !== task.title) changes.title = parsedTitle.data
    const newDescription = description.trim() ? description.trim() : null
    if (newDescription !== task.description) changes.description = newDescription
    if (Object.keys(changes).length === 0) return onClose()

    // Si falla, el error sale en un toast y el diálogo queda abierto para reintentar.
    update.mutate({ id: task.id, ...changes }, { onSuccess: onClose })
  }

  /** "Mover a…": al final de la columna elegida, en este u otro tablero. */
  function onMove() {
    if (!canMove) return
    move.mutate(
      { task, columnId, boardId: targetBoardId, prevId: null, nextId: null },
      {
        onSuccess: () => {
          if (targetBoardId !== board.id) {
            const name = boards.data?.find((b) => b.id === targetBoardId)?.name
            toast.success(name ? `Tarjeta movida a ${name}` : 'Tarjeta movida')
          }
          onClose()
        },
      },
    )
  }

  return (
    <form onSubmit={onSave} {...drop.handlers} className="relative grid gap-5 p-4" noValidate>
      {drop.dragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-lg border-2 border-dashed border-foreground/30 bg-popover/90"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ImagePlus className="size-4" />
            Soltá la imagen para adjuntarla
          </span>
        </div>
      )}
      <DialogHeader>
        <DialogTitle>Tarjeta</DialogTitle>
        <DialogDescription>
          Creada el {dateFormat.format(new Date(task.createdAt))}
          {task.completedAt && `, terminada el ${dateFormat.format(new Date(task.completedAt))}`}
          {noteBoard && (
            <>
              {'. '}
              <Link
                to={`/b/${noteBoard.slug}?nota=${task.noteId}`}
                className="text-foreground underline underline-offset-2"
              >
                {noteBoard.id === board.id ? 'Ver la nota' : `Ver la nota en ${noteBoard.name}`}
              </Link>
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="task-title">Título</Label>
        <textarea
          id="task-title"
          rows={2}
          value={title}
          maxLength={LIMITS.taskTitle}
          onChange={(event) => {
            setTitle(event.target.value)
            setTitleError(null)
          }}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? 'task-title-error' : undefined}
          className="resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base leading-snug outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
        />
        {titleError && (
          <p id="task-title-error" role="alert" className="text-[13px] text-destructive">
            {titleError}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="task-description">Descripción</Label>
        <textarea
          id="task-description"
          rows={5}
          value={description}
          maxLength={LIMITS.taskDescription}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Detalles, links, lo que haga falta."
          className="resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span id="task-images-label" className="text-sm leading-none font-medium">
            Imágenes
          </span>
          <span className="text-xs text-muted-foreground pointer-coarse:hidden">
            Pegá o arrastrá una imagen
          </span>
        </div>
        <ImageGallery
          labelledBy="task-images-label"
          images={task.images}
          pending={uploads.pending}
          canAdd={roomForImages > 0}
          onAdd={addImages}
          onDelete={(image) => removeImage.mutate(image.id)}
        />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm leading-none font-medium">Mover a…</legend>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <BoardSelect
            aria-label="Tablero"
            boards={activeBoards}
            value={targetBoardId}
            onValueChange={setTargetBoardId}
          />
          <Select
            value={columnId}
            disabled={targetColumns.length === 0}
            onValueChange={setTargetColumnId}
          >
            <SelectTrigger aria-label="Columna" className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targetColumns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            disabled={!canMove || move.isPending}
            onClick={onMove}
          >
            {move.isPending ? 'Moviendo…' : 'Mover'}
          </Button>
        </div>
      </fieldset>

      <DialogFooter className="sm:justify-between">
        <DeleteTaskButton
          title={task.title}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(task.id, { onSuccess: onClose })}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

function DeleteTaskButton({
  title,
  pending,
  onConfirm,
}: {
  title: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
          <Trash2 />
          Borrar tarjeta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar la tarjeta?</AlertDialogTitle>
          <AlertDialogDescription>«{title}» se borra para siempre.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={onConfirm}>
            Borrar tarjeta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
