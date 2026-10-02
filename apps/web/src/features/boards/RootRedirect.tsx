import { useQuery } from '@tanstack/react-query'
import { Navigate, useSearchParams } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { boardsQuery } from './api'
import { readLastBoard } from './lastBoard'

/**
 * `/` abre el último tablero que se usó o, si no hay, General (`/?vista=notas`, en sus notas).
 * `/?nueva-nota` (el atajo de la app instalada) abre General en Notas, listo para escribir.
 */
export function RootRedirect() {
  const boards = useQuery(boardsQuery)
  const [searchParams] = useSearchParams()

  if (boards.isPending) return null
  if (boards.isError) {
    return (
      <ErrorState
        title="No se pudieron cargar los tableros."
        message={boards.error.message}
        onRetry={() => void boards.refetch()}
      />
    )
  }

  const general = boards.data.find((b) => b.isGeneral)
  if (searchParams.has('nueva-nota') && general) {
    return <Navigate to={`/b/${general.slug}?vista=notas&escribir=1`} replace />
  }

  const last = readLastBoard()
  const target = boards.data.find((b) => b.slug === last) ?? general ?? boards.data[0]

  if (!target) {
    return <ErrorState title="No hay tableros." message="Corré el seed para crear General." />
  }
  const view = searchParams.get('vista') === 'notas' ? '?vista=notas' : ''
  return <Navigate to={`/b/${target.slug}${view}`} replace />
}
