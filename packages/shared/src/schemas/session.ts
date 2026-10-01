import { z } from 'zod'
import './common'

export const unlockSchema = z.object({
  code: z.string().min(1, 'Escribí el código').max(500),
})

export type UnlockInput = z.infer<typeof unlockSchema>
