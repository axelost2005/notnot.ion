import { z } from 'zod'
import { LIMITS } from '../constants'
import { idSchema } from './common'

export const noteContentSchema = z
  .string()
  .trim()
  .min(1, 'La nota está vacía')
  .max(LIMITS.noteContent, `Máximo ${LIMITS.noteContent} caracteres`)

export const createNoteSchema = z.object({
  boardId: idSchema,
  content: noteContentSchema,
})

export const notesQuerySchema = z.object({
  before: idSchema.optional(),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>
