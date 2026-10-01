import { z } from 'zod'
import { BOARD_COLORS, LIMITS } from '../constants'
import './common'

export const boardColorSchema = z.enum(BOARD_COLORS)

export const boardNameSchema = z
  .string()
  .trim()
  .min(1, 'El nombre no puede quedar vacío')
  .max(LIMITS.boardName, `Máximo ${LIMITS.boardName} caracteres`)

export const createBoardSchema = z.object({
  name: boardNameSchema,
  color: boardColorSchema,
})

export const updateBoardSchema = z
  .object({
    name: boardNameSchema,
    color: boardColorSchema,
    archived: z.boolean(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'No hay nada para cambiar')

export type CreateBoardInput = z.infer<typeof createBoardSchema>
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>
