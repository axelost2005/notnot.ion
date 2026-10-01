import type { BoardColor, Folder, FolderIcon } from '@notnot/shared'
import { FOLDER_ICONS } from '@notnot/shared'
import type { LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { boardStyle } from '../boards/colors'
import { ColorPicker } from '../boards/ColorPicker'
import { useUpdateFolder } from './api'
import { DEFAULT_FOLDER_ICON, FOLDER_ICON_OPTIONS } from './folderIcons'

type Props = {
  folder: Folder | null
  onClose: () => void
}

/** "Personalizar": el color y el ícono de una carpeta, con la fila como va a quedar. */
export function FolderStyleDialog({ folder, onClose }: Props) {
  return (
    <Dialog open={folder !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
        // El foco va al color elegido y no al primero de la lista, que parecería elegido también.
        onOpenAutoFocus={(event) => {
          if (!(event.target instanceof HTMLElement)) return
          const checked = event.target.querySelector<HTMLInputElement>('input:checked')
          if (!checked) return
          event.preventDefault()
          checked.focus()
        }}
      >
        {folder && <StyleForm key={folder.id} folder={folder} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function StyleForm({ folder, onClose }: { folder: Folder; onClose: () => void }) {
  const update = useUpdateFolder()
  const [color, setColor] = useState(folder.color)
  const [icon, setIcon] = useState(folder.icon)
  const { Icon } = icon ? FOLDER_ICON_OPTIONS[icon] : DEFAULT_FOLDER_ICON

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    update.mutate({ id: folder.id, color, icon }, { onSuccess: onClose })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Personalizar la carpeta</DialogTitle>
        <DialogDescription>Cómo se ve en la sidebar.</DialogDescription>
      </DialogHeader>

      <div
        aria-hidden="true"
        className="flex h-9 min-w-0 items-center gap-2 rounded-md border bg-sidebar px-3 text-sm text-sidebar-foreground"
      >
        <FolderGlyph Icon={Icon} color={color} className="size-4" />
        <span className="truncate">{folder.name}</span>
      </div>

      {/* El gris es el de siempre: elegirlo deja la carpeta sin color. */}
      <ColorPicker
        value={color ?? 'gray'}
        onChange={(next) => setColor(next === 'gray' ? null : next)}
      />
      <IconPicker value={icon} onChange={setIcon} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** El ícono de una carpeta con su color (o el gris de siempre). */
export function FolderGlyph({
  Icon,
  color,
  className,
}: {
  Icon: LucideIcon
  color: BoardColor | null
  className?: string
}) {
  return (
    <Icon
      aria-hidden="true"
      style={color ? boardStyle(color) : undefined}
      className={cn('shrink-0', color ? 'text-(--board)' : 'text-muted-foreground', className)}
    />
  )
}

/** Radios nativos, como los colores: se recorren con las flechas. */
function IconPicker({
  value,
  onChange,
}: {
  value: FolderIcon | null
  onChange: (icon: FolderIcon | null) => void
}) {
  const options = [
    { key: null, ...DEFAULT_FOLDER_ICON },
    ...FOLDER_ICONS.map((key) => ({ key, ...FOLDER_ICON_OPTIONS[key] })),
  ]

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">Ícono</legend>
      <div className="flex flex-wrap gap-1">
        {options.map(({ key, Icon, label }) => (
          <label
            key={key ?? 'carpeta'}
            title={label}
            className="grid size-9 cursor-pointer place-items-center"
          >
            <input
              type="radio"
              name="folder-icon"
              checked={value === key}
              onChange={() => onChange(key)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors peer-checked:bg-accent peer-checked:text-foreground peer-checked:ring-1 peer-checked:ring-foreground/25 peer-focus-visible:ring-2 peer-focus-visible:ring-ring hover:text-foreground"
            >
              <Icon className="size-4" />
            </span>
            <span className="sr-only">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
