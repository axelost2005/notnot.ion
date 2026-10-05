import type { DayItem } from '@notnot/shared'
import { groupDayItems } from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import { ListChecks } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { today as getToday } from '../finance/format'
import { dayItemsQuery } from './api'
import { DayComposer } from './DayComposer'
import { DayItemRow } from './DayItemRow'
import { carriedFrom, dayHeading, dayOptions, longDay, type DayOption } from './format'

const HEADING_CLASS = 'border-b pb-2 text-sm font-semibold first-letter:uppercase'

/** `/hoy`: lo de hoy (con lo pendiente de días anteriores) y los días que vienen. */
export function TodayView() {
  const items = useQuery(dayItemsQuery)
  const today = getToday()
  const days = dayOptions(today)
  const [day, setDay] = useState(today)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <title>Hoy – notnot.ion</title>
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b px-4">
        <ListChecks aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <h1 className="text-[15px] font-semibold tracking-tight max-md:text-[17px]">Hoy</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-6 py-6 max-md:px-4 max-md:py-4">
          {items.isPending ? (
            <div className="grid gap-4" aria-label="Cargando lo de hoy">
              <Skeleton className="h-5 w-48" />
              {[72, 56, 64].map((width) => (
                <Skeleton key={width} className="h-6" style={{ width: `${width}%` }} />
              ))}
            </div>
          ) : items.isError ? (
            <ErrorState
              title="No se pudo cargar lo de hoy."
              message={items.error.message}
              onRetry={() => void items.refetch()}
            />
          ) : (
            <DayGroups items={items.data} today={today} days={days} />
          )}
        </div>
      </div>

      {items.isSuccess && <DayComposer days={days} day={day} onDayChange={setDay} />}
    </div>
  )
}

function DayGroups({ items, today, days }: { items: DayItem[]; today: string; days: DayOption[] }) {
  const groups = groupDayItems(items, today)

  return (
    <>
      <section aria-label="Hoy">
        <h2 className={HEADING_CLASS}>{longDay(today)}</h2>
        {groups.today.length === 0 ? (
          <div className="py-4">
            <p className="font-medium">Nada para hoy.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Anotá abajo lo que tengas que hacer. Lo que no taches pasa solo al día siguiente.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {groups.today.map((item) => (
              <DayItemRow
                key={item.id}
                item={item}
                days={days}
                carriedFrom={item.day < today ? carriedFrom(item.day, today) : undefined}
              />
            ))}
          </ul>
        )}
      </section>

      {groups.upcoming.map((group) => (
        <section key={group.day} aria-labelledby={`dia-${group.day}`} className="mt-8">
          <h2 id={`dia-${group.day}`} className={HEADING_CLASS}>
            {dayHeading(group.day, today)}
          </h2>
          <ul className="divide-y">
            {group.items.map((item) => (
              <DayItemRow key={item.id} item={item} days={days} />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
