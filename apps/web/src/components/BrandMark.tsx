import { cn } from '@/lib/utils'

/** El `[ ]` de las notas: la marca de la app. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cn('size-4', className)}>
      <path
        d="M5.5 2.5h-2v11h2M10.5 2.5h2v11h-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  )
}
