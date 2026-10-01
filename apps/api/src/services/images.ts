import { randomUUID } from 'node:crypto'
import type { ImageInfo, ImageType } from '@notnot/shared'
import { LIMITS } from '@notnot/shared'
import { del, get, put } from '@vercel/blob'
import { prisma } from '../db'
import { env } from '../env'
import { badRequest, conflict, notFound } from '../middleware/errors'

const EXTENSIONS: Record<ImageType, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

const ONE_YEAR_S = 365 * 24 * 60 * 60

/** El formato según los primeros bytes: no se confía en el `Content-Type` del pedido. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end))
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (png.every((byte, i) => bytes[i] === byte)) return 'image/png'
  return null
}

export const toImageInfo = (image: { id: string; width: number; height: number }): ImageInfo => ({
  id: image.id,
  width: image.width,
  height: image.height,
})

type Upload = { body: Buffer; width: number; height: number }

/** De quién es la imagen: una tarjeta o un pago (sus comprobantes). */
export type ImageOwner = { taskId: string } | { paymentId: string }

/** Cuántas tiene ya (o `null` si el dueño no existe) y cuántas puede tener. */
async function ownerImages(owner: ImageOwner) {
  const select = { _count: { select: { images: true } } } as const
  if ('taskId' in owner) {
    const task = await prisma.task.findUnique({ where: { id: owner.taskId }, select })
    return { count: task?._count.images ?? null, max: LIMITS.imagesPerTask, what: 'La tarjeta' }
  }
  const payment = await prisma.payment.findUnique({ where: { id: owner.paymentId }, select })
  return { count: payment?._count.images ?? null, max: LIMITS.imagesPerPayment, what: 'El pago' }
}

/** Sube la imagen al store privado y la suma a su tarjeta o pago. */
export async function addImage(owner: ImageOwner, upload: Upload): Promise<ImageInfo> {
  const contentType = detectImageType(upload.body)
  if (!contentType) throw badRequest('Mandá una imagen WebP, JPEG o PNG')

  const { count, max, what } = await ownerImages(owner)
  if (count === null) throw notFound(`${what} no existe`)
  if (count >= max) throw conflict(`${what} ya tiene ${max} imágenes`)

  const pathname = `images/${randomUUID()}.${EXTENSIONS[contentType]}`
  await put(pathname, upload.body, {
    access: 'private',
    contentType,
    // No cambian una vez subidas: el CDN entre la función y el store las guarda un año.
    cacheControlMaxAge: ONE_YEAR_S,
    token: env.BLOB_READ_WRITE_TOKEN,
  })
  try {
    const image = await prisma.image.create({
      data: {
        ...owner,
        pathname,
        contentType,
        size: upload.body.length,
        width: upload.width,
        height: upload.height,
      },
    })
    return toImageInfo(image)
  } catch (error) {
    await deleteBlobs([pathname])
    throw error
  }
}

/** El archivo de la imagen, para mandarlo tal cual. */
export async function openImage(id: string) {
  const image = await prisma.image.findUnique({ where: { id } })
  if (!image) throw notFound('La imagen no existe')
  const file = await get(image.pathname, { access: 'private', token: env.BLOB_READ_WRITE_TOKEN })
  if (file?.statusCode !== 200) throw notFound('La imagen no existe')
  return { stream: file.stream, contentType: image.contentType, size: image.size }
}

export async function deleteImage(id: string): Promise<void> {
  const image = await prisma.image.delete({ where: { id }, select: { pathname: true } })
  await deleteBlobs([image.pathname])
}

/** Los archivos de las imágenes, para borrarlos después de borrar sus filas. */
export async function imagePathnames(where: ImageOwner | { boardId: string }) {
  const images = await prisma.image.findMany({
    where: 'boardId' in where ? { task: { boardId: where.boardId } } : where,
    select: { pathname: true },
  })
  return images.map((image) => image.pathname)
}

/**
 * Se borran después de la base: si falla, quedan archivos sueltos en el store, pero ninguna fila
 * apunta a un archivo que no existe.
 */
export async function deleteBlobs(pathnames: string[]): Promise<void> {
  if (pathnames.length === 0) return
  try {
    await del(pathnames, { token: env.BLOB_READ_WRITE_TOKEN })
  } catch (error) {
    console.error('No se pudieron borrar imágenes del store', error)
  }
}
