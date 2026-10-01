import { z } from 'zod'
import { LIMITS } from '../constants'
import { CURRENCIES } from '../finance/finance'
import { idSchema } from './common'

/** "2026-10". */
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido')

/** Vacía o solo espacios se guarda como `null`. */
const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Máximo ${max} caracteres`)
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null))

export const createPaymentSchema = z.object({
  date: z.iso.date('Fecha inválida'),
  amountCents: z
    .number()
    .int()
    .positive('El monto tiene que ser mayor a cero')
    .max(LIMITS.paymentAmountCents, 'El monto es demasiado grande'),
  currency: z.enum(CURRENCIES),
  boardId: idSchema.nullable().optional(),
  category: optionalText(LIMITS.paymentCategory).optional(),
  description: optionalText(LIMITS.paymentDescription).optional(),
})

export const updatePaymentSchema = createPaymentSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'No hay nada para cambiar')

export const paymentsQuerySchema = z.object({ month: monthSchema })

export type CreatePaymentInput = z.input<typeof createPaymentSchema>
export type UpdatePaymentInput = z.input<typeof updatePaymentSchema>
/** Ya validado (los textos vacíos pasaron a `null`): lo que usa la API. */
export type PaymentData = z.output<typeof createPaymentSchema>
export type PaymentChanges = z.output<typeof updatePaymentSchema>
