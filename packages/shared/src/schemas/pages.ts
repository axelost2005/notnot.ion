import { z } from 'zod'
import { BOARD_COLORS, FOLDER_ICONS, LIMITS } from '../constants'
import { idSchema } from './common'

export const folderNameSchema = z
  .string()
  .trim()
  .min(1, 'El nombre no puede quedar vacío')
  .max(LIMITS.folderName, `Máximo ${LIMITS.folderName} caracteres`)

/** `null` es la raíz. */
const locationSchema = idSchema.nullable()

export const createFolderSchema = z.object({
  name: folderNameSchema,
  parentId: locationSchema.optional(),
})

/** Color e ícono: `null` vuelve a como se ve sin elegir. */
export const updateFolderSchema = z
  .object({
    name: folderNameSchema,
    parentId: locationSchema,
    color: z.enum(BOARD_COLORS).nullable(),
    icon: z.enum(FOLDER_ICONS).nullable(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'No hay nada para cambiar')

/** Puede quedar vacío: se muestra como "Sin título". */
export const pageTitleSchema = z
  .string()
  .trim()
  .max(LIMITS.pageTitle, `Máximo ${LIMITS.pageTitle} caracteres`)

export const pageContentSchema = z
  .string()
  .max(LIMITS.pageContent, `Máximo ${LIMITS.pageContent} caracteres`)

export const createPageSchema = z.object({
  title: pageTitleSchema.optional(),
  folderId: locationSchema.optional(),
})

export const updatePageSchema = z
  .object({ title: pageTitleSchema, content: pageContentSchema, folderId: locationSchema })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'No hay nada para cambiar')

export type CreateFolderInput = z.infer<typeof createFolderSchema>
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>
export type CreatePageInput = z.infer<typeof createPageSchema>
export type UpdatePageInput = z.infer<typeof updatePageSchema>
