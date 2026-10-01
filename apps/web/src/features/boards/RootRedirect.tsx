import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { boardsQuery } from './api'
import { readLastBoard } from './lastBoard'

/** `/` abre el último tablero que se usó o, si no hay, Inbox. */
export function RootRedirect() {
  const boards = useQuery(boardsQuery)

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

  const last = readLastBoard()
  const target =
    boards.data.find((b) => b.slug === last) ?? boards.data.find((b) => b.isInbox) ?? boards.data[0]

  if (!target)
    return <ErrorState title="No hay tableros." message="Corré el seed para crear Inbox." />
  return <Navigate to={`/b/${target.slug}`} replace />
}
