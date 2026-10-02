import { columnNameSchema, LIMITS } from '@notnot/shared'
import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateColumn } from './api'

export function AddColumn({ boardId }: { boardId: string }) {
  const create = useCreateColumn(boardId)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  function close() {
    setOpen(false)
    setName('')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = columnNameSchema.safeParse(name)
    if (!parsed.success) return
    create.mutate(parsed.data, { onSuccess: close })
  }

  return (
    <div className="w-66 shrink-0 max-md:w-full">
      {open ? (
        <form onSubmit={submit} className="grid gap-2 rounded-lg bg-lane p-2">
          <Input
            autoFocus
            value={name}
            maxLength={LIMITS.columnName}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close()
            }}
            placeholder="Nombre de la columna"
            aria-label="Nombre de la nueva columna"
            className="bg-card"
          />
          <div className="flex items-center gap-1">
            <Button type="submit" size="sm" disabled={create.isPending || name.trim() === ''}>
              Agregar columna
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Cancelar"
              onClick={close}
            >
              <X />
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-3.5" />
          Agregar columna
        </Button>
      )}
    </div>
  )
}
