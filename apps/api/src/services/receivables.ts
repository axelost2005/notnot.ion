import type { Receivable, ReceivableChanges, ReceivableData } from '@notnot/shared'
import { prisma } from '../db'
import type * as Db from '../generated/prisma/client'
import { conflict } from '../middleware/errors'
import { assertClient, fromDay, toCurrency, toDay } from './payments'

// Por cobrar: lo que me deben. Lo cobrado son sus pagos (`Payment.receivableId`).

const receivableInclude = {
  payments: {
    select: { id: true, date: true, amountCents: true },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Db.Prisma.ReceivableInclude

type ReceivableRow = Db.Receivable & {
  payments: { id: string; date: Date; amountCents: bigint }[]
}

/** `undefined` no cambia la fecha; `null` la saca. */
const optionalDay = (day: string | null | undefined) =>
  day === undefined ? undefined : day === null ? null : fromDay(day)

function toReceivable(row: ReceivableRow): Receivable {
  const payments = row.payments.map((payment) => ({
    id: payment.id,
    date: toDay(payment.date),
    amountCents: Number(payment.amountCents),
  }))
  return {
    id: row.id,
    description: row.description,
    amountCents: Number(row.amountCents),
    currency: toCurrency(row.currency),
    boardId: row.boardId,
    dueDate: row.dueDate ? toDay(row.dueDate) : null,
    note: row.note,
    paidCents: payments.reduce((sum, payment) => sum + payment.amountCents, 0),
    payments,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** Todas, pendientes y cobradas: son pocas y la web las agrupa. */
export async function listReceivables(): Promise<Receivable[]> {
  const rows = await prisma.receivable.findMany({
    orderBy: { createdAt: 'asc' },
    include: receivableInclude,
  })
  return rows.map(toReceivable)
}

export async function createReceivable(input: ReceivableData): Promise<Receivable> {
  await assertClient(input.boardId)
  const row = await prisma.receivable.create({
    data: {
      description: input.description,
      amountCents: BigInt(input.amountCents),
      currency: input.currency,
      boardId: input.boardId ?? null,
      dueDate: optionalDay(input.dueDate) ?? null,
      note: input.note ?? null,
    },
    include: receivableInclude,
  })
  return toReceivable(row)
}

export async function updateReceivable(id: string, input: ReceivableChanges): Promise<Receivable> {
  await assertClient(input.boardId)
  if (input.currency) {
    // Sus pagos van en su moneda: con pagos en la otra, no se puede cambiar.
    const others = await prisma.payment.count({
      where: { receivableId: id, currency: { not: input.currency } },
    })
    if (others > 0) throw conflict('Ya tiene pagos anotados en la otra moneda')
  }
  const row = await prisma.receivable.update({
    where: { id },
    data: {
      description: input.description,
      amountCents: input.amountCents === undefined ? undefined : BigInt(input.amountCents),
      currency: input.currency,
      boardId: input.boardId,
      dueDate: optionalDay(input.dueDate),
      note: input.note,
    },
    include: receivableInclude,
  })
  return toReceivable(row)
}

/** Sus pagos quedan, sin el vínculo (la FK lo pone en `null`). */
export async function deleteReceivable(id: string): Promise<void> {
  await prisma.receivable.delete({ where: { id } })
}
