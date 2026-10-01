import { PrismaNeon } from '@prisma/adapter-neon'
import { env } from './env'
import { PrismaClient } from './generated/prisma/client'

// Conexión pooled de Neon: es la que conviene en serverless.
export const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }),
})
