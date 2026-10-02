import { columnNameSchema, LIMITS, type Column, type Lane } from '@notnot/shared'
import { Check, CircleCheck, Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useDeleteColumn, useUpdateColumn } from './api'
import { laneHeaderClass, laneNameClass } from './LaneSection'
import { laneTitleClass } from './laneColors'

type Props = {
  boardId: string
  column: Column
  lane: Lane
  count: number
  /** Por qué no se puede borrar; `null` si se puede. */
  deleteBlockedReason: string | null
}

export function ColumnHeader({ boardId, column, lane, count, deleteBlockedReason }: Props) {
  const update = useUpdateColumn(boardId)
  const remove = useDeleteColumn(boardId)
  const [renaming, setRenaming] = useState(false)

  return (
    <header className={laneHeaderClass}>
      {renaming ? (
        <RenameColumn
          name={column.name}
          onDone={(name) => {
            setRenaming(false)
            if (name !== null && name !== column.name) update.mutate({ id: column.id, name })
          }}
        />
      ) : (
        <h2 id={`column-${column.id}`} className={cn(laneNameClass, laneTitleClass[lane])}>
          {column.name}
        </h2>
      )}
      {column.isDone && (
        <Check
          className="size-3.5 shrink-0 text-muted-foreground"
          role="img"
          aria-label="Columna de terminadas"
        />
      )}
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto text-muted-foreground"
            aria-label={`Opciones de la columna ${column.name}`}
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={column.isDone}
            onSelect={() => update.mutate({ id: column.id, isDone: true })}
          >
            <CircleCheck />
            {column.isDone ? 'Es la de terminadas' : 'Usar para terminadas'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={deleteBlockedReason !== null}
            onSelect={() => remove.mutate(column.id)}
            className="flex-wrap"
          >
            <Trash2 />
            Borrar columna
            {deleteBlockedReason && (
              <span className="w-full pl-5.5 text-xs text-muted-foreground">
                {deleteBlockedReason}
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

/** Enter o salir del campo guarda; Escape cancela. */
function RenameColumn({ name, onDone }: { name: string; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(name)

  function save() {
    const parsed = columnNameSchema.safeParse(value)
    onDone(parsed.success ? parsed.data : null)
  }

  return (
    <input
      autoFocus
      value={value}
      maxLength={LIMITS.columnName}
      aria-label="Nombre de la columna"
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.target.select()}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') save()
        if (event.key === 'Escape') onDone(null)
      }}
      // 16 px en el celu: con menos, el iPhone hace zoom al enfocarlo.
      className="h-7 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-[13px] font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-9 max-md:text-base"
    />
  )
}
