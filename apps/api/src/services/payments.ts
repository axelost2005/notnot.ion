import type { Payment, PaymentsSummary } from '@notnot/shared'
import {
  compareNames,
  CURRENCIES,
  monthOf,
  shiftMonth,
  type Currency,
  type PaymentChanges,
  type PaymentData,
} from '@notnot/shared'
import { prisma } from '../db'
import type * as Db from '../generated/prisma/client'
import { notFound } from '../middleware/errors'
import { deleteBlobs, imagePathnames, toImageInfo } from './images'

// Finanzas: los pagos que me hicieron, con sus comprobantes (imágenes).

const paymentInclude = {
  images: { select: { id: true, width: true, height: true }, orderBy: { createdAt: 'asc' } },
} as const

type PaymentRow = Db.Payment & { images: { id: string; width: number; height: number }[] }

const isCurrency = (value: string): value is Currency =>
  (CURRENCIES as readonly string[]).includes(value)

/** La fecha se guarda como día (sin hora): viaja como "2026-10-15". */
const toDay = (date: Date) => date.toISOString().slice(0, 10)
const fromDay = (day: string) => new Date(`${day}T00:00:00.000Z`)

function toPayment(payment: PaymentRow): Payment {
  return {
    id: payment.id,
    date: toDay(payment.date),
    amountCents: Number(payment.amountCents),
    currency: isCurrency(payment.currency) ? payment.currency : 'ARS',
    boardId: payment.boardId,
    category: payment.category,
    description: payment.description,
    images: payment.images.map(toImageInfo),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  }
}

/** Los de un mes ("2026-10"), del más nuevo al más viejo. */
export async function listPayments(month: string): Promise<Payment[]> {
  const payments = await prisma.payment.findMany({
    where: { date: { gte: fromDay(`${month}-01`), lt: fromDay(`${shiftMonth(month, 1)}-01`) } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: paymentInclude,
  })
  return payments.map(toPayment)
}

/** Para elegir el mes y autocompletar la categoría. Son pocos: se agrupan acá. */
export async function getPaymentsSummary(): Promise<PaymentsSummary> {
  const rows = await prisma.payment.findMany({ select: { date: true, category: true } })
  const months = new Map<string, number>()
  const categories = new Map<string, string>()
  for (const row of rows) {
    const month = monthOf(toDay(row.date))
    months.set(month, (months.get(month) ?? 0) + 1)
    // Una sola por nombre, sin importar mayúsculas: queda la primera que se escribió.
    if (row.category && !categories.has(row.category.toLowerCase())) {
      categories.set(row.category.toLowerCase(), row.category)
    }
  }
  return {
    months: [...months.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, count]) => ({ month, count })),
    categories: [...categories.values()].sort(compareNames),
  }
}

async function assertClient(boardId: string | null | undefined) {
  if (!boardId) return
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } })
  if (!board) throw notFound('El cliente no existe')
}

export async function createPayment(input: PaymentData): Promise<Payment> {
  await assertClient(input.boardId)
  const payment = await prisma.payment.create({
    data: {
      date: fromDay(input.date),
      amountCents: BigInt(input.amountCents),
      currency: input.currency,
      boardId: input.boardId ?? null,
      category: input.category ?? null,
      description: input.description ?? null,
    },
    include: paymentInclude,
  })
  return toPayment(payment)
}

export async function updatePayment(id: string, input: PaymentChanges): Promise<Payment> {
  await assertClient(input.boardId)
  const payment = await prisma.payment.update({
    where: { id },
    data: {
      date: input.date === undefined ? undefined : fromDay(input.date),
      amountCents: input.amountCents === undefined ? undefined : BigInt(input.amountCents),
      currency: input.currency,
      boardId: input.boardId,
      category: input.category,
      description: input.description,
    },
    include: paymentInclude,
  })
  return toPayment(payment)
}

/** Con sus comprobantes (las filas en cascada; los archivos, después). */
export async function deletePayment(id: string): Promise<void> {
  const images = await imagePathnames({ paymentId: id })
  await prisma.payment.delete({ where: { id } })
  await deleteBlobs(images)
}
