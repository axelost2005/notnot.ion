import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url(),
  APP_SECRET: z
    .string()
    .trim()
    .refine(
      (value) => value.split(/\s+/).length >= 4,
      'tiene que ser una frase de 4 o más palabras',
    ),
  SESSION_SECRET: z.string().min(32, 'tiene que tener al menos 32 caracteres'),
  // Store privado de Vercel Blob (imágenes). Uno para Development/Preview y otro para Production.
  BLOB_READ_WRITE_TOKEN: z.string().min(1, 'falta el token del store de Vercel Blob'),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Variables de entorno inválidas:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

export const env = parseEnv(process.env)
