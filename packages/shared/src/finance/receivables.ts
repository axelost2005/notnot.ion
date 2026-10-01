// Por cobrar: lo que me deben. Lo cobrado es la suma de sus pagos.

type Progress = { amountCents: number; paidCents: number }

type Dated = Progress & {
  /** El día que vence ("2026-10-15"), si tiene. */
  dueDate: string | null
  createdAt: string
  payments: readonly { date: string }[]
}

/** Lo que falta cobrar. Nunca menos de cero: si pagaron de más, está cobrada. */
export const remainingCents = ({ amountCents, paidCents }: Progress) =>
  Math.max(0, amountCents - paidCents)

/** Días de un día a otro: de "2026-10-01" a "2026-10-04" son 3; para atrás, negativo. */
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

/** El día del último pago: cuándo quedó cobrada. `null` si no tiene pagos. */
export const settledOn = ({ payments }: Pick<Dated, 'payments'>) =>
  payments.reduce<string | null>(
    (last, payment) => (last === null || payment.date > last ? payment.date : last),
    null,
  )

/**
 * En grupos: las vencidas (la más vieja primero), las que vencen (por fecha), las sin fecha (la
 * última anotada primero) y las cobradas (la última cobrada primero). `today` es el día del
 * dispositivo.
 */
export function groupReceivables<T extends Dated>(receivables: readonly T[], today: string) {
  const pending = receivables.filter((receivable) => remainingCents(receivable) > 0)
  const byDue = (a: T, b: T) =>
    (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.createdAt.localeCompare(b.createdAt)
  return {
    overdue: pending.filter((r) => r.dueDate !== null && r.dueDate < today).sort(byDue),
    upcoming: pending.filter((r) => r.dueDate !== null && r.dueDate >= today).sort(byDue),
    undated: pending
      .filter((r) => r.dueDate === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    settled: receivables
      .filter((r) => remainingCents(r) === 0)
      .sort((a, b) => (settledOn(b) ?? '').localeCompare(settledOn(a) ?? '')),
  }
}

/** Cuántas pendientes vencen hoy o ya vencieron (el número de la sidebar). */
export const dueCount = (
  receivables: readonly (Progress & Pick<Dated, 'dueDate'>)[],
  today: string,
) =>
  receivables.filter((r) => remainingCents(r) > 0 && r.dueDate !== null && r.dueDate <= today)
    .length
