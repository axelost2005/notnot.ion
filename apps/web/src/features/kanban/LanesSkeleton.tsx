import { Skeleton } from '@/components/ui/skeleton'

export function LanesSkeleton() {
  return (
    <div
      className="flex gap-3 overflow-hidden px-4 pt-1 pb-5 max-md:flex-col max-md:gap-4 max-md:px-3 max-md:pt-3"
      aria-label="Cargando tablero"
    >
      {/* En el celu, con la forma de la lista: el título del grupo y su bloque. */}
      {[0, 1, 2].map((lane) => (
        <div key={lane} className="flex w-66 shrink-0 flex-col gap-3 max-md:w-full">
          <Skeleton className="h-4 w-24 md:hidden" />
          <Skeleton className="h-56 rounded-lg max-md:h-28 max-md:rounded-xl" />
        </div>
      ))}
    </div>
  )
}
