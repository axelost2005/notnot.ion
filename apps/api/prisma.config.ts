import { existsSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

// Prisma 7 no carga el .env solo. Las variables ya definidas (CI, Vercel) tienen prioridad.
const rootEnv = new URL('../../.env', import.meta.url)
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // El CLI (migraciones) va por la conexión directa; la app usa la pooled vía el adapter.
    // `generate` no necesita base, por eso no se usa env() (que falla si falta la variable).
    url: process.env.DIRECT_URL ?? '',
  },
})
