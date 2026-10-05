import { z } from 'zod'
import { LIMITS } from '../constants'
import { splitDayItems } from '../today/dayItems'

const daySchema = z.iso.date('Día inválido')

export const dayItemTextSchema = z
  .string()
  .trim()
  .min(1, 'No puede quedar vacío')
  .max(LIMITS.dayItemText, `Máximo ${LIMITS.dayItemText} caracteres`)

/** Lo escrito o pegado: una cosa por línea. */
export const createDayItemsSchema = z
  .object({
    day: daySchema,
    text: z.string().max(LIMITS.dayItemText * LIMITS.dayItemsPerPost, 'Es demasiado largo'),
  })
  .transform(({ day, text }) => ({ day, texts: splitDayItems(text) }))
  .refine(({ texts }) => texts.length > 0, 'No hay nada para anotar')
  .refine(
    ({ texts }) => texts.length <= LIMITS.dayItemsPerPost,
    `Hasta ${LIMITS.dayItemsPerPost} por vez`,
  )

export const updateDayItemSchema = z
  .object({ text: dayItemTextSchema, day: daySchema, done: z.boolean() })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'No hay nada para cambiar')

export type CreateDayItemsInput = z.input<typeof createDayItemsSchema>
/** Ya separado en líneas: lo que usa la API. */
export type DayItemsData = z.output<typeof createDayItemsSchema>
export type UpdateDayItemInput = z.infer<typeof updateDayItemSchema>
