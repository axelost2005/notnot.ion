import { LIMITS, type ImageInfo } from '@notnot/shared'
import { api } from './api'

/** Las imágenes son privadas: las sirve la API detrás del candado. */
export const imageUrl = (id: string) => `/api/images/${id}`

const QUALITY = 0.82

const encode = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))

/**
 * Achica la imagen (el lado más largo a 2000 px como mucho) y la pasa a WebP: una foto del celu
 * pasa de varios MB a unos cientos de kB y entra holgada en el límite de las funciones de Vercel.
 */
export async function prepareImage(file: File) {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('No se pudo leer la imagen')
  }
  const scale = Math.min(1, LIMITS.imageMaxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar la imagen')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let blob = await encode(canvas, 'image/webp')
  if (blob?.type !== 'image/webp') {
    // Un navegador que no sabe hacer WebP: JPEG, con fondo blanco donde había transparencia.
    context.globalCompositeOperation = 'destination-over'
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    blob = await encode(canvas, 'image/jpeg')
  }
  if (!blob) throw new Error('No se pudo preparar la imagen')
  if (blob.size > LIMITS.imageBytes) throw new Error('La imagen pesa demasiado, aun achicada')
  return { blob, width, height }
}

/** La achica y la sube a `path` (por ejemplo `/tasks/:id/images`). */
export async function uploadImage(path: string, file: File) {
  const { blob, width, height } = await prepareImage(file)
  return api<ImageInfo>(`${path}?width=${width}&height=${height}`, { method: 'POST', file: blob })
}
