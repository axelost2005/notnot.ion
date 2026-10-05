import type { DayItem, DayItemsData, UpdateDayItemInput } from '@notnot/shared'
import { prisma } from '../db'
import type * as Db from '../generated/prisma/client'
import { fromDay, toDay } from './payments'

// Hoy: cosas para hacer por día, aparte de los tableros.

const DAY_MS = 24 * 60 * 60 * 1000

function toDayItem(item: Db.DayItem): DayItem {
  return {
    id: item.id,
    day: toDay(item.day),
    text: item.text,
    doneAt: item.doneAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

/**
 * Todo lo pendiente y lo tachado desde la medianoche del dispositivo (sin ella, en las últimas
 * 24 h). Lo tachado antes ya no se ve, pero queda en la base.
 */
export async function listDayItems(dayStart: Date | null): Promise<DayItem[]> {
  const since = dayStart ?? new Date(Date.now() - DAY_MS)
  const items = await prisma.dayItem.findMany({
    where: { OR: [{ doneAt: null }, { doneAt: { gte: since } }] },
    orderBy: [{ day: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
  return items.map(toDayItem)
}

export async function createDayItems({ day, texts }: DayItemsData): Promise<DayItem[]> {
  // Un milisegundo de diferencia entre cada una: así quedan en el orden de las líneas.
  const now = Date.now()
  const items = await prisma.dayItem.createManyAndReturn({
    data: texts.map((text, index) => ({
      day: fromDay(day),
      text,
      createdAt: new Date(now + index),
    })),
  })
  return items.map(toDayItem).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function updateDayItem(id: string, input: UpdateDayItemInput): Promise<DayItem> {
  const item = await prisma.dayItem.update({
    where: { id },
    data: {
      text: input.text,
      day: input.day === undefined ? undefined : fromDay(input.day),
      doneAt: input.done === undefined ? undefined : input.done ? new Date() : null,
    },
  })
  return toDayItem(item)
}

export async function deleteDayItem(id: string): Promise<void> {
  await prisma.dayItem.delete({ where: { id } })
}
