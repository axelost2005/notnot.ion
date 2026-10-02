import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

/** Las columnas: en la compu, el kanban con scroll horizontal; en el celu, una lista vertical. */
export const lanesClass =
  'flex min-h-0 flex-1 items-start gap-3 overflow-x-auto p-3 max-md:flex-col max-md:items-stretch max-md:gap-4 max-md:overflow-x-hidden max-md:overflow-y-auto max-md:overscroll-y-contain max-md:px-4 max-md:pt-1 max-md:pb-6'

/** El encabezado de una columna. En el celu queda fijo arriba mientras se recorre su lista. */
export const laneHeaderClass =
  'flex h-10 shrink-0 items-center gap-1.5 pr-1 pl-3 max-md:sticky max-md:top-0 max-md:z-10 max-md:h-11 max-md:bg-background max-md:pr-0 max-md:pl-4'

export const laneNameClass = 'truncate text-[13px] font-medium max-md:text-sm max-md:font-semibold'

type Props = {
  /** Lo que recibe al soltar: la columna o, en General, el estado. */
  id: string
  labelledBy: string
  header: ReactNode
  footer?: ReactNode
  /** Las tarjetas (`<li>`). */
  children: ReactNode
}

/**
 * Una columna. Toda la columna recibe tarjetas (también el título y el pie), aunque esté vacía.
 * En el celu es un grupo de la lista: el título y, abajo, las tarjetas y el pie en un solo bloque.
 */
export function LaneSection({ id, labelledBy, header, footer, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={labelledBy}
      data-over={isOver ? '' : undefined}
      className="group/lane flex h-full w-66 shrink-0 flex-col rounded-lg bg-lane transition-colors md:data-over:bg-accent max-md:h-auto max-md:w-full max-md:rounded-none max-md:bg-transparent"
    >
      {header}
      <div className="contents max-md:flex max-md:flex-col max-md:overflow-hidden max-md:rounded-xl max-md:border max-md:bg-card max-md:transition-shadow max-md:group-data-over/lane:border-ring max-md:group-data-over/lane:ring-3 max-md:group-data-over/lane:ring-ring/20">
        <ol className="flex min-h-16 flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2 max-md:min-h-0 max-md:flex-none max-md:gap-0 max-md:overflow-visible max-md:p-0 max-md:[&:not(:empty):not(:last-child)]:border-b">
          {children}
        </ol>
        {footer}
      </div>
    </section>
  )
}
