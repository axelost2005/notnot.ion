import { z } from 'zod'
import { LIMITS } from '../constants'
import { idSchema } from './common'

export const columnNameSchema = z
  .string()
  .trim()
  .min(1, 'El nombre no puede quedar vacío')
  .max(LIMITS.columnName, `Máximo ${LIMITS.columnName} caracteres`)

export const createColumnSchema = z.object({ name: columnNameSchema })

export const updateColumnSchema = z
  .object({
    name: columnNameSchema,
    // Solo se puede elegir cuál es la de terminadas: siempre tiene que haber una.
    isDone: z.literal(true),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'No hay nada para cambiar')

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, 'El título no puede quedar vacío')
  .max(LIMITS.taskTitle, `Máximo ${LIMITS.taskTitle} caracteres`)

/** Vacía o solo espacios se guarda como `null`. */
export const taskDescriptionSchema = z
  .string()
  .max(LIMITS.taskDescription, `Máximo ${LIMITS.taskDescription} caracteres`)
  .nullable()
  .transform((value) => (value?.trim() ? value.trim() : null))

export const createTaskSchema = z.object({
  columnId: idSchema,
  title: taskTitleSchema,
  description: taskDescriptionSchema.optional(),
})

export const updateTaskSchema = z
  .object({
    title: taskTitleSchema,
    description: taskDescriptionSchema,
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'No hay nada para cambiar')

export const moveTaskSchema = z.object({
  columnId: idSchema,
  boardId: idSchema.optional(),
  prevId: idSchema.nullable().optional(),
  nextId: idSchema.nullable().optional(),
})

export type CreateColumnInput = z.infer<typeof createColumnSchema>
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>
export type CreateTaskInput = z.input<typeof createTaskSchema>
export type UpdateTaskInput = z.input<typeof updateTaskSchema>
export type MoveTaskInput = z.infer<typeof moveTaskSchema>
