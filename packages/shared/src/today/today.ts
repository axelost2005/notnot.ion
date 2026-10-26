// Hoy: las tareas con día de todos los tableros. Lo pendiente de un día que ya pasó se ve en el
// de hoy.

type Dated = {
  id: string
  /** El día para el que es ("2026-10-05"). Sin día, no está en Hoy. */
  day: string | null
  completedAt: string | null
  createdAt: string
}

type WithDay<T> = T & { day: string }

/** "2026-10-05" + 1 = "2026-10-06". */
export function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const hasDay = <T extends Dated>(task: T): task is WithDay<T> => task.day !== null

/** Por día y, dentro del día, en el orden en que se anotó. */
const byDayAndCreation = (a: WithDay<Dated>, b: WithDay<Dated>) =>
  a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)

/**
 * Lo pendiente de hoy (con lo de días anteriores primero), lo que se tachó (las tareas vienen sin
 * el historial, así que es lo de hoy) y cada día que viene con algo. `today` es el día del
 * dispositivo.
 */
export function groupToday<T extends Dated>(tasks: readonly T[], today: string) {
  const dated = tasks.filter(hasDay).sort(byDayAndCreation)
  const open = dated.filter((task) => task.completedAt === null)
  const upcoming: { day: string; tasks: WithDay<T>[] }[] = []
  for (const task of open) {
    if (task.day <= today) continue
    const last = upcoming.at(-1)
    if (last?.day === task.day) last.tasks.push(task)
    else upcoming.push({ day: task.day, tasks: [task] })
  }
  return {
    today: open.filter((task) => task.day <= today),
    done: dated.filter((task) => task.completedAt !== null),
    upcoming,
  }
}

/** Cuántas quedan para hoy (el número del cuadrado de Hoy). */
export const pendingTodayCount = (
  tasks: readonly Pick<Dated, 'day' | 'completedAt'>[],
  today: string,
) => tasks.filter((t) => t.completedAt === null && t.day !== null && t.day <= today).length
