import { hasTaskMarker, stripTaskMarker, type BoardSummary, type NoteTask } from '@notnot/shared'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useMatch, useNavigate } from 'react-router'
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
import { cn } from '@/lib/utils'
import { BoardChip } from '../boards/BoardChip'
import { useDeleteNote, useToggleTask, type ClientNote } from './api'
import { fullDateTime, splitLinks, timeAgo } from './format'

type Props = {
  note: ClientNote
  boardsById: Map<string, BoardSummary>
  currentBoardId: string
  now: number
  /** La nota a la que se llegó desde una tarjeta. */
  highlighted?: boolean
}

export function NoteItem({ note, boardsById, currentBoardId, now, highlighted }: Props) {
  const taskByLine = new Map(note.tasks.map((task) => [task.noteLine, task]))
  const lines = note.content.split(/\r?\n/)

  return (
    <article
      data-note-id={note.id}
      aria-busy={note.pending ? true : undefined}
      aria-current={highlighted ? true : undefined}
      className={cn(
        'group/note px-4 py-2.5',
        note.pending && 'opacity-60',
        highlighted && 'bg-accent/70',
      )}
    >
      <header className="mb-1 flex h-5 items-center gap-2">
        <time
          dateTime={note.createdAt}
          title={fullDateTime(note.createdAt)}
          className="text-xs text-muted-foreground"
        >
          {note.pending ? 'enviando…' : timeAgo(note.createdAt, now)}
        </time>
        {!note.pending && <DeleteNoteButton noteId={note.id} boardId={currentBoardId} />}
      </header>

      <div className="grid gap-0.5 text-sm leading-relaxed max-md:text-[15px]">
        {lines.map((line, index) => {
          const task = taskByLine.get(index)
          if (task) {
            return (
              <TaskLine
                key={index}
                task={task}
                board={boardsById.get(task.boardId)}
                showBoard={task.boardId !== currentBoardId}
                disabled={note.pending ?? false}
              />
            )
          }
          // Era una tarea y la tarjeta se borró: queda tachada con el texto original.
          if (hasTaskMarker(line) && stripTaskMarker(line)) {
            return (
              <p key={index} className="break-words text-muted-foreground line-through">
                {stripTaskMarker(line)}
              </p>
            )
          }
          if (line.trim() === '') return <div key={index} aria-hidden="true" className="h-2" />
          return (
            <p key={index} className="break-words whitespace-pre-wrap">
              {splitLinks(line).map((part, i) =>
                part.href ? (
                  <a
                    key={i}
                    href={part.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
                  >
                    {part.text}
                  </a>
                ) : (
                  part.text
                ),
              )}
            </p>
          )
        })}
      </div>
    </article>
  )
}

type TaskLineProps = {
  task: NoteTask
  board: BoardSummary | undefined
  showBoard: boolean
  disabled: boolean
}

function TaskLine({ task, board, showBoard, disabled }: TaskLineProps) {
  const toggle = useToggleTask()
  const navigate = useNavigate()
  // La ventana de notas es solo para escribir, y una del historial no está en el tablero:
  // en esos casos el título no abre la tarjeta.
  const inNotesWindow = useMatch('/notas/:slug') !== null
  const opensCard = !inNotesWindow && !task.archived
  // El cache se actualiza después de un await: sin esto el checkbox vuelve atrás un instante.
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const done = optimistic ?? task.done

  function onToggle() {
    setOptimistic(!done)
    toggle.mutate(
      { taskId: task.id, boardId: task.boardId, done },
      { onSettled: () => setOptimistic(null) },
    )
  }

  return (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={done}
        disabled={disabled}
        onChange={onToggle}
        aria-label={`${done ? 'Destildar' : 'Tildar'} ${task.title}`}
        className="mt-[5px] size-3.5 shrink-0 cursor-pointer accent-foreground disabled:cursor-default max-md:mt-[3px] max-md:size-[18px]"
      />
      {!opensCard ? (
        <span className={cn('min-w-0 break-words', done && 'text-muted-foreground')}>
          {task.title}
        </span>
      ) : (
        <button
          type="button"
          disabled={disabled || !board}
          onClick={() => board && void navigate(`/b/${board.slug}?tarjeta=${task.id}`)}
          className={cn(
            'min-w-0 text-left break-words underline-offset-2 outline-none hover:underline focus-visible:underline disabled:no-underline',
            done && 'text-muted-foreground',
          )}
        >
          {task.title}
        </button>
      )}
      {showBoard && board && <BoardChip board={board} className="mt-[3px]" />}
    </div>
  )
}

function DeleteNoteButton({ noteId, boardId }: { noteId: string; boardId: string }) {
  const remove = useDeleteNote(boardId)

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Borrar nota"
          className="ml-auto text-muted-foreground opacity-0 group-hover/note:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar la nota?</AlertDialogTitle>
          <AlertDialogDescription>
            Las tarjetas que creó quedan en sus tableros.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(noteId)}
          >
            Borrar nota
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
