import { WifiOff } from 'lucide-react'
import { useOnline } from './online'

/** No hay modo offline: si se corta la red, se avisa y los cambios fallan con un toast. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null

  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 bg-foreground px-4 pt-[calc(env(safe-area-inset-top)+0.375rem)] pb-1.5 text-[13px] text-background"
    >
      <WifiOff className="size-3.5" aria-hidden="true" />
      Sin conexión. Lo que hagas no se va a guardar hasta que vuelva.
    </div>
  )
}
