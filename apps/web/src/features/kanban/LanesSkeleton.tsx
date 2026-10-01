import { Skeleton } from '@/components/ui/skeleton'

export function LanesSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3 max-md:p-4"
      aria-label="Cargando tablero"
    >
      {[0, 1, 2].map((lane) => (
        <Skeleton key={lane} className="w-66 shrink-0 rounded-lg max-md:w-[85vw]" />
      ))}
    </div>
  )
}
