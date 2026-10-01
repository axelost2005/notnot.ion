import type { Folder } from '@notnot/shared'
import { canMoveFolder, compareNames, folderPath } from '@notnot/shared'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setFolderOpen } from './openFolders'

/** Lo que se mueve: una carpeta o una nota, con la carpeta donde está ahora. */
export type Movable = { kind: 'folder' | 'page'; id: string; name: string; parentId: string | null }

const ROOT = 'raiz'

type Props = {
  item: Movable | null
  folders: Folder[]
  onMove: (item: Movable, parentId: string | null) => Promise<unknown>
  onClose: () => void
}

/** "Mover a…": la raíz o cualquier carpeta (una carpeta no puede ir dentro de sí misma). */
export function MoveDialog({ item, folders, onMove, onClose }: Props) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {item && <MoveForm item={item} folders={folders} onMove={onMove} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function MoveForm({ item, folders, onMove, onClose }: Props & { item: Movable }) {
  const [target, setTarget] = useState(item.parentId ?? ROOT)
  const [pending, setPending] = useState(false)

  const options = folders
    .filter((folder) => item.kind === 'page' || canMoveFolder(folders, item.id, folder.id))
    .map((folder) => ({
      id: folder.id,
      label: folderPath(folders, folder.id)
        .map((f) => f.name)
        .join(' / '),
    }))
    .sort((a, b) => compareNames(a.label, b.label))
  const parentId = target === ROOT ? null : target

  async function submit() {
    setPending(true)
    try {
      await onMove(item, parentId)
      // Que se vea dónde quedó.
      if (parentId) {
        for (const folder of folderPath(folders, parentId)) setFolderOpen(folder.id, true)
      }
      onClose()
    } catch {
      // El error ya salió en un toast: el diálogo queda abierto para reintentar.
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Mover {item.kind === 'folder' ? 'la carpeta' : 'la nota'}</DialogTitle>
        <DialogDescription className="truncate">«{item.name}»</DialogDescription>
      </DialogHeader>
      <Select value={target} onValueChange={setTarget}>
        <SelectTrigger aria-label="Mover a" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ROOT}>Notas (sin carpeta)</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <span className="truncate">{option.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={pending || parentId === item.parentId} onClick={() => void submit()}>
          {pending ? 'Moviendo…' : 'Mover'}
        </Button>
      </DialogFooter>
    </>
  )
}
