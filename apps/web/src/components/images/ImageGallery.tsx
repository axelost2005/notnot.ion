import type { ImageInfo } from '@notnot/shared'
import { ImagePlus, LoaderCircle, X } from 'lucide-react'
import { useRef, useState, type ComponentProps } from 'react'
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
import { imageUrl } from '@/lib/images'
import { ImageViewer } from './ImageViewer'

/**
 * Una imagen que todavía no está en la API, con su vista previa local: subiéndose o, si es
 * `queued`, esperando (por ejemplo, a que se guarde el pago nuevo al que va).
 */
export type PendingImage = { key: string; url: string; queued?: boolean }

type Props = {
  images: ImageInfo[]
  pending: PendingImage[]
  /** Si todavía entran más. */
  canAdd: boolean
  onAdd: (files: File[]) => void
  onDelete: (image: ImageInfo) => void
  /** Quitar una de las que esperan (todavía no se subió: no hace falta confirmar). */
  onRemovePending?: (key: string) => void
  /** Id del texto que nombra la lista (por ejemplo "Imágenes"). */
  labelledBy: string
}

/** Miniaturas que se agrandan al tocarlas, se borran y se suman con el botón "Adjuntar". */
export function ImageGallery({
  images,
  pending,
  canAdd,
  onAdd,
  onDelete,
  onRemovePending,
  labelledBy,
}: Props) {
  const [viewing, setViewing] = useState<ImageInfo | null>(null)
  const thumbs = useRef(new Map<string, HTMLElement>())

  return (
    <>
      <ul aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <li key={image.id} className="group/thumb relative">
            <button
              type="button"
              aria-label={`Ver la imagen ${index + 1}`}
              onClick={() => setViewing(image)}
              className="block size-16 overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                ref={(element) => {
                  if (element) thumbs.current.set(image.id, element)
                  else thumbs.current.delete(image.id)
                }}
                src={imageUrl(image.id)}
                alt=""
                decoding="async"
                className="size-full object-cover"
              />
            </button>
            <DeleteImageButton number={index + 1} onConfirm={() => onDelete(image)} />
          </li>
        ))}
        {pending.map((item, index) =>
          item.queued ? (
            <li key={item.key} className="group/thumb relative">
              <img
                src={item.url}
                alt=""
                className="block size-16 rounded-md border bg-muted object-cover"
              />
              {onRemovePending && (
                <RemoveButton
                  label={`Quitar la imagen ${images.length + index + 1}`}
                  onClick={() => onRemovePending(item.key)}
                />
              )}
            </li>
          ) : (
            <li
              key={item.key}
              aria-busy="true"
              className="relative size-16 overflow-hidden rounded-md border bg-muted"
            >
              <img src={item.url} alt="" className="size-full object-cover opacity-50" />
              <LoaderCircle
                role="img"
                aria-label="Subiendo imagen"
                className="absolute inset-0 m-auto size-5 animate-spin"
              />
            </li>
          ),
        )}
        {canAdd && (
          <li>
            <label className="flex size-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-foreground/25 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring">
              <ImagePlus aria-hidden="true" className="size-4" />
              <span className="text-[11px] leading-none">Adjuntar</span>
              <input
                type="file"
                accept="image/*"
                multiple
                aria-label="Adjuntar imagen"
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])]
                  // Así se puede volver a elegir el mismo archivo.
                  event.target.value = ''
                  if (files.length > 0) onAdd(files)
                }}
                className="sr-only"
              />
            </label>
          </li>
        )}
      </ul>
      <ImageViewer
        image={viewing}
        getThumb={(id) => thumbs.current.get(id) ?? null}
        onClose={() => setViewing(null)}
      />
    </>
  )
}

/** La "×" de la esquina de una miniatura. */
function RemoveButton({ label, ...props }: { label: string } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label={label}
      // El área que se toca es más grande que el botón (before:).
      className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background opacity-0 shadow-sm transition-opacity outline-none group-hover/thumb:opacity-100 before:absolute before:-inset-2.5 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:opacity-100"
      {...props}
    >
      <X className="size-3" strokeWidth={3} />
    </button>
  )
}

function DeleteImageButton({ number, onConfirm }: { number: number; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <RemoveButton label={`Borrar la imagen ${number}`} />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar la imagen?</AlertDialogTitle>
          <AlertDialogDescription>Se borra para siempre.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Borrar imagen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
