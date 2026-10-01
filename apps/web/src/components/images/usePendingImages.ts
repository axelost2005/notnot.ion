import { useState } from 'react'
import type { PendingImage } from './ImageGallery'

/**
 * Las imágenes que se están subiendo, con su vista previa local. `upload` llama a `done` cuando
 * termina, bien o mal (los errores los muestra el toast de siempre).
 */
export function usePendingImages(upload: (file: File, done: () => void) => void) {
  const [pending, setPending] = useState<PendingImage[]>([])

  function add(files: File[]) {
    for (const file of files) {
      const item: PendingImage = { key: crypto.randomUUID(), url: URL.createObjectURL(file) }
      setPending((list) => [...list, item])
      upload(file, () => {
        setPending((list) => list.filter((other) => other.key !== item.key))
        URL.revokeObjectURL(item.url)
      })
    }
  }

  return { pending, add }
}
