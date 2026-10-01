import type { BoardSummary } from '@notnot/shared'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { notesQuery } from './api'
import { NoteItem } from './NoteItem'

type Props = { board: BoardSummary; boards: BoardSummary[] }

/** Cada minuto, para que "hace 5 min" no quede viejo. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Tipo chat: las más nuevas abajo. Al llegar arriba trae las anteriores. */
export function NotesList({ board, boards }: Props) {
  const notes = useInfiniteQuery(notesQuery(board.id))
  const now = useNow(60_000)
  const scrollRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const view = useRef({ newestId: '', oldestId: '', scrollHeight: 0, atBottom: true })
  const [searchParams] = useSearchParams()
  const focusNoteId = searchParams.get('nota')
  const focused = useRef<string | null>(null)

  const ordered = useMemo(
    () => (notes.data ? notes.data.pages.flatMap((page) => page.notes).toReversed() : []),
    [notes.data],
  )
  const boardsById = useMemo(() => new Map(boards.map((b) => [b.id, b])), [boards])

  // Ajusta el scroll después de pintar: abajo con notas nuevas, quieto al cargar las viejas.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const prev = view.current
    const newest = ordered.at(-1)
    const oldest = ordered[0]
    const loadedOlder =
      oldest && prev.oldestId && oldest.id !== prev.oldestId && newest?.id === prev.newestId
    if (loadedOlder) {
      el.scrollTop += el.scrollHeight - prev.scrollHeight
    } else if (newest && newest.id !== prev.newestId && (prev.atBottom || newest.pending)) {
      el.scrollTop = el.scrollHeight
    }
    view.current = {
      newestId: newest?.id ?? '',
      oldestId: oldest?.id ?? '',
      scrollHeight: el.scrollHeight,
      atBottom: el.scrollHeight - el.scrollTop - el.clientHeight < 48,
    }
  }, [ordered])

  // Viniendo de "Ver la nota": la lleva al centro una sola vez, cuando ya está cargada.
  useEffect(() => {
    if (!focusNoteId || focused.current === focusNoteId) return
    const element = scrollRef.current?.querySelector(`[data-note-id="${CSS.escape(focusNoteId)}"]`)
    if (!element) return
    focused.current = focusNoteId
    element.scrollIntoView({ block: 'center' })
  }, [focusNoteId, ordered])

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = notes
  useEffect(() => {
    const root = scrollRef.current
    const target = topRef.current
    if (!root || !target || !hasNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { root, rootMargin: '200px 0px 0px 0px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (notes.isPending) {
    return (
      <div className="grid flex-1 content-end gap-4 p-4" aria-label="Cargando notas">
        {[70, 45, 60].map((width) => (
          <div key={width} className="grid gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4" style={{ width: `${width}%` }} />
          </div>
        ))}
      </div>
    )
  }

  if (notes.isError) {
    return (
      <ErrorState
        title="No se pudieron cargar las notas."
        message={notes.error.message}
        onRetry={() => void notes.refetch()}
      />
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const el = event.currentTarget
        view.current.scrollHeight = el.scrollHeight
        view.current.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="flex min-h-full flex-col justify-end py-2">
        <div ref={topRef} />
        {isFetchingNextPage && (
          <p className="px-4 py-2 text-xs text-muted-foreground">Cargando notas anteriores…</p>
        )}
        {ordered.length === 0 ? (
          <div className="grid gap-2 px-4 py-6 text-[13px] text-muted-foreground">
            <p className="font-medium text-foreground">Todavía no hay notas.</p>
            <p>
              Escribí abajo como en un chat. Cada línea que empieza con{' '}
              <span className="font-mono text-foreground">[]</span> se vuelve una tarjeta, y con{' '}
              <span className="font-mono text-foreground">@tablero</span> la mandás a otro tablero.
            </p>
          </div>
        ) : (
          ordered.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              boardsById={boardsById}
              currentBoardId={board.id}
              now={now}
              highlighted={note.id === focusNoteId}
            />
          ))
        )}
      </div>
    </div>
  )
}
