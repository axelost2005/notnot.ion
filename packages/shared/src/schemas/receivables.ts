import { z } from 'zod'
import { LIMITS } from '../constants'
import { CURRENCIES } from '../finance/finance'
import { idSchema } from './common'
import { amountCentsSchema, optionalText } from './payments'

export const createReceivableSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Escribí qué te deben')
    .max(LIMITS.receivableDescription, `Máximo ${LIMITS.receivableDescription} caracteres`),
  amountCents: amountCentsSchema,
  currency: z.enum(CURRENCIES),
  boardId: idSchema.nullable().optional(),
  /** El día que me lo tienen que pagar. */
  dueDate: z.iso.date('Fecha inválida').nullable().optional(),
  note: optionalText(LIMITS.receivableNote).optional(),
})

export const updateReceivableSchema = createReceivableSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'No hay nada para cambiar')

export type CreateReceivableInput = z.input<typeof createReceivableSchema>
export type UpdateReceivableInput = z.input<typeof updateReceivableSchema>
/** Ya validado (la nota vacía pasó a `null`): lo que usa la API. */
export type ReceivableData = z.output<typeof createReceivableSchema>
export type ReceivableChanges = z.output<typeof updateReceivableSchema>
