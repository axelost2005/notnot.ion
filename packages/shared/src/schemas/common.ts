import { z } from 'zod'

// Mensajes de error de Zod en español, para la API y la web.
z.config(z.locales.es())

export const idSchema = z.uuid('Id inválido')

export const idParamsSchema = z.object({ id: idSchema })
