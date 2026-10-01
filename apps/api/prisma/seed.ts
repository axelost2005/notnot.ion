import { PrismaNeon } from '@prisma/adapter-neon'
import {
  DEFAULT_COLUMNS,
  INBOX,
  positionBeforeFirst,
  positionsBetween,
  uniqueSlug,
} from '@notnot/shared'
import { PrismaClient } from '../src/generated/prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('Falta DATABASE_URL')

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })

// Idempotente: si Inbox ya existe no hace nada.
async function main() {
  const existing = await prisma.board.findFirst({ where: { isInbox: true } })
  if (existing) {
    console.log('Inbox ya existe, no hay nada que hacer.')
    return
  }

  const boards = await prisma.board.findMany({ select: { slug: true, position: true } })
  const columnPositions = positionsBetween(null, null, DEFAULT_COLUMNS.length)

  await prisma.board.create({
    data: {
      name: INBOX.name,
      slug: uniqueSlug(
        INBOX.slug,
        boards.map((b) => b.slug),
      ),
      color: INBOX.color,
      isInbox: true,
      // Inbox va siempre primero.
      position: positionBeforeFirst(boards),
      columns: {
        create: DEFAULT_COLUMNS.map((column, i) => ({ ...column, position: columnPositions[i]! })),
      },
    },
  })
  console.log('Inbox creado con sus 3 columnas.')
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
