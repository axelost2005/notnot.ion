import { z } from 'zod'
import { LIMITS } from '../constants'
import './common'

const sideSchema = z.coerce.number().int().min(1).max(LIMITS.imageMaxSide)

/** Las medidas viajan en la URL: el cuerpo del pedido es la imagen. */
export const imageUploadQuerySchema = z.object({ width: sideSchema, height: sideSchema })
