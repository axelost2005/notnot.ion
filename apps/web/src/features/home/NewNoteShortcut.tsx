import { useQuery } from '@tanstack/react-query'
import { Navigate, useSearchParams } from 'react-router'
import { boardsQuery } from '../boards/api'

/** `/?nueva-nota` (el atajo de la app instalada): las notas de General, listas para escribir. */
export function NewNoteShortcut() {
  const [searchParams] = useSearchParams()
  const boards = useQuery(boardsQuery)
  const general = boards.data?.find((b) => b.isGeneral)

  if (!searchParams.has('nueva-nota') || !general) return null
  return <Navigate to={`/b/${general.slug}?vista=notas&escribir=1`} replace />
}
