import { useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { NativeSelect } from '@/components/NativeSelect'
import { boardsQuery } from '../boards/api'
import { boardStyle } from '../boards/colors'
import { OfflineBanner } from '../pwa/OfflineBanner'
import { NotesPanel } from './NotesPanel'

/**
 * `/notas/:slug`: solo las notas, en una ventana chica para tener al costado (por ejemplo en
 * una reunión). Cambiar de tablero cambia dónde se escribe.
 */
export function NotesWindow() {
  const { slug } = useParams()
  const navigate = useNavigate()
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

  const board = boards.data.find((b) => b.slug === slug)
  if (!board) {
    const fallback = boards.data.find((b) => b.isGeneral) ?? boards.data[0]
    return fallback ? <Navigate to={`/notas/${fallback.slug}`} replace /> : null
  }
  // Los activos, y el actual aunque esté archivado.
  const options = boards.data.filter((b) => b.archivedAt === null || b.id === board.id)

  return (
    <div style={boardStyle(board.color)} className="flex h-dvh flex-col">
      <title>{`Notas de ${board.name} – notnot.ion`}</title>
      <OfflineBanner />
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b px-3">
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-(--board)" />
        <NativeSelect
          aria-label="Tablero"
          value={board.slug}
          onChange={(event) => void navigate(`/notas/${event.target.value}`, { replace: true })}
          className="min-w-0 flex-1"
        >
          {options.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
      </header>
      {/* Al cambiar de tablero el composer se vuelve a enfocar: se sigue escribiendo. */}
      <NotesPanel key={board.id} board={board} autoFocus className="min-h-0 flex-1" />
    </div>
  )
}
