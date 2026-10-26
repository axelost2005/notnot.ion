import type { Task } from '@notnot/shared'
import { Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { today as getToday } from '../finance/format'
import { isForToday, shortDay } from '../today/format'
import { useSetTaskDay } from './api'

type Props = {
  task: Task
  /** En Hoy ya se sabe para cuándo es: sin "mañana" al lado. */
  showDay?: boolean
  className?: string
}

/**
 * El sol de una tarea: la manda a Hoy o la saca. Se ve prendido si es de hoy; si no, aparece al
 * pasar el mouse (con el dedo, siempre). Si es para otro día, lo dice al lado.
 */
export function SunButton({ task, showDay = true, className }: Props) {
  const setDay = useSetTaskDay()
  const today = getToday()
  const on = isForToday(task, today)
  const later = !on && task.day !== null

  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      {showDay && later && (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {shortDay(task.day!, today)}
        </span>
      )}
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? `Sacar de Hoy: ${task.title}` : `Para hoy: ${task.title}`}
        title={on ? 'Sacar de Hoy' : 'Para hoy'}
        onClick={() => setDay.mutate({ task, day: on ? null : today })}
        className={cn(
          'grid size-6 place-items-center rounded-md text-muted-foreground/70 outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-8',
          // Apagado se ve solo al pasar por la fila (o con el dedo, siempre).
          !on &&
            'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
          on && 'text-sun-ink hover:text-sun-ink',
        )}
      >
        <Sun className={cn('size-3.5 pointer-coarse:size-4', on && 'fill-current')} />
      </button>
    </div>
  )
}
