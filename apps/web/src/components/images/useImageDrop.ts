import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react'

const imagesIn = (files: FileList) => [...files].filter((file) => file.type.startsWith('image/'))
const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files')

/**
 * Pegar (Ctrl+V) o soltar imágenes sobre un elemento. Si lo que se pega también trae texto
 * (por ejemplo celdas de una planilla, que vienen con una imagen), se pega el texto como siempre.
 */
export function useImageDrop(onImages: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false)
  // Entrar a un hijo dispara `dragleave` en el padre: se cuenta cuántos niveles adentro está.
  const depth = useRef(0)

  return {
    dragging,
    handlers: {
      onPaste(event: ClipboardEvent) {
        const images = imagesIn(event.clipboardData.files)
        if (images.length === 0 || event.clipboardData.getData('text/plain') !== '') return
        event.preventDefault()
        onImages(images)
      },
      onDragEnter(event: DragEvent) {
        if (!carriesFiles(event)) return
        event.preventDefault()
        depth.current += 1
        setDragging(true)
      },
      onDragOver(event: DragEvent) {
        if (!carriesFiles(event)) return
        // Sin esto el navegador no deja soltar (y abriría el archivo en la pestaña).
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      },
      onDragLeave(event: DragEvent) {
        if (!carriesFiles(event)) return
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setDragging(false)
      },
      onDrop(event: DragEvent) {
        if (!carriesFiles(event)) return
        event.preventDefault()
        depth.current = 0
        setDragging(false)
        const images = imagesIn(event.dataTransfer.files)
        if (images.length > 0) onImages(images)
      },
    },
  }
}
