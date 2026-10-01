import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router'
import { BrandMark } from '@/components/BrandMark'
import { ErrorState } from '@/components/ErrorState'
import { sessionQuery } from '@/features/lock/api'
import { isApiError } from '@/lib/api'

/** Todo lo que no es `/unlock` necesita el candado abierto. */
export function SessionGate() {
  const session = useQuery(sessionQuery)
  const location = useLocation()

  if (session.isPending) {
    return (
      <div className="grid h-dvh place-items-center text-muted-foreground" aria-label="Cargando">
        <BrandMark className="size-5 animate-pulse" />
      </div>
    )
  }

  if (session.isError) {
    if (isApiError(session.error, 401)) {
      return <Navigate to="/unlock" replace state={{ from: location.pathname }} />
    }
    return (
      <ErrorState
        title="No hay conexión con el servidor."
        message={session.error.message}
        onRetry={() => void session.refetch()}
      />
    )
  }

  return <Outlet />
}
