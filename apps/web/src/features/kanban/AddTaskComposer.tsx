import { LIMITS, taskTitleSchema } from '@notnot/shared'
import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useCreateTask } from './api'

type Props = { boardId: string; columnId: string; columnName: string }

/** Al pie de cada columna. Queda abierto después de agregar, para cargar varias seguidas. */
export function AddTaskComposer({ boardId, columnId, columnName }: Props) {
  const create = useCreateTask(boardId)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')

  function close() {
    setOpen(false)
    setTitle('')
  }

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const parsed = taskTitleSchema.safeParse(title)
    if (!parsed.success) return
    create.mutate({ columnId, title: parsed.data }, { onSuccess: () => setTitle('') })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-2 mb-2 flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-3.5" />
        Agregar tarjeta
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="grid shrink-0 gap-2 px-2 pt-1 pb-2">
      <textarea
        autoFocus
        rows={2}
        value={title}
        maxLength={LIMITS.taskTitle}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
          if (event.key === 'Escape') close()
        }}
        onBlur={() => {
          if (title.trim() === '') close()
        }}
        placeholder="Título de la tarjeta"
        aria-label={`Nueva tarjeta en ${columnName}`}
        className="resize-none rounded-md border bg-card px-3 py-2 text-sm leading-snug outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="flex items-center gap-1">
        <Button type="submit" size="sm" disabled={create.isPending || title.trim() === ''}>
          Agregar
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancelar" onClick={close}>
          <X />
        </Button>
      </div>
    </form>
  )
}
