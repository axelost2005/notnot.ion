import type { BoardDetail, BoardSummary, Note, NotesPage, Task } from '@notnot/shared'
import { parseNote, positionAfterLast, positionBeforeFirst, sortByPosition } from '@notnot/shared'
import {
  infiniteQueryOptions,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { api } from '@/lib/api'
import { boardQuery, boardsQuery } from '../boards/api'

/** Una nota recién escrita se muestra antes de que la API conteste. */
export type ClientNote = Note & { pending?: boolean }
type NotesPageData = Omit<NotesPage, 'notes'> & { notes: ClientNote[] }
type NotesData = InfiniteData<NotesPageData, string | null>

export const notesQuery = (boardId: string) =>
  infiniteQueryOptions({
    queryKey: ['notes', boardId],
    queryFn: ({ pageParam }) =>
      api<NotesPageData>(
        `/boards/${boardId}/notes${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })

/** Las notas muestran el título y el estado actual de sus tarjetas: hay que refrescarlas. */
export const refreshNotes = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: ['notes'] })

function mapNotes(data: NotesData | undefined, map: (notes: ClientNote[]) => ClientNote[]) {
  if (!data) return data
  return { ...data, pages: data.pages.map((page) => ({ ...page, notes: map(page.notes) })) }
}

type CreateNoteVariables = { board: BoardSummary; content: string; boards: BoardSummary[] }

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ board, content }: CreateNoteVariables) =>
      api<Note>('/notes', { method: 'POST', json: { boardId: board.id, content } }),
    onMutate: async ({ board, content, boards }) => {
      const key = notesQuery(board.id).queryKey
      await queryClient.cancelQueries({ queryKey: key })

      // La misma lectura que va a hacer la API, para mostrar la nota ya con sus tareas.
      const bySlug = new Map(boards.map((b) => [b.slug, b.id]))
      const { tasks } = parseNote(content, {
        currentBoardSlug: board.slug,
        boards: boards.map((b) => ({ slug: b.slug, archived: b.archivedAt !== null })),
      })
      const tempId = `pending-${crypto.randomUUID()}`
      const note: ClientNote = {
        id: tempId,
        boardId: board.id,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        tasks: tasks.map((task) => ({
          id: `${tempId}-${task.line}`,
          noteLine: task.line,
          title: task.title,
          boardId: bySlug.get(task.boardSlug) ?? board.id,
          done: false,
        })),
        pending: true,
      }

      queryClient.setQueryData<NotesData>(key, (data) => {
        if (!data) return { pages: [{ notes: [note], nextCursor: null }], pageParams: [null] }
        const [first, ...rest] = data.pages
        return {
          ...data,
          pages: [{ ...first!, notes: [note, ...first!.notes] }, ...rest],
        }
      })
      return { tempId, targetBoardIds: [...new Set(note.tasks.map((t) => t.boardId))] }
    },
    onSuccess: (note, { board }, context) => {
      queryClient.setQueryData<NotesData>(notesQuery(board.id).queryKey, (data) =>
        mapNotes(data, (notes) => notes.map((n) => (n.id === context.tempId ? note : n))),
      )
    },
    onError: (_error, { board }, context) => {
      if (!context) return
      queryClient.setQueryData<NotesData>(notesQuery(board.id).queryKey, (data) =>
        mapNotes(data, (notes) => notes.filter((n) => n.id !== context.tempId)),
      )
    },
    onSettled: (_note, _error, _variables, context) => {
      for (const boardId of context?.targetBoardIds ?? []) {
        void queryClient.invalidateQueries({ queryKey: boardQuery(boardId).queryKey })
      }
      void queryClient.invalidateQueries({ queryKey: boardsQuery.queryKey })
    },
  })
}

export function useDeleteNote(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => api<void>(`/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: (_data, noteId) => {
      queryClient.setQueryData<NotesData>(notesQuery(boardId).queryKey, (data) =>
        mapNotes(data, (notes) => notes.filter((n) => n.id !== noteId)),
      )
      // Las tarjetas que creó pierden el vínculo con la nota.
      void queryClient.invalidateQueries({ queryKey: ['board'] })
    },
  })
}

type ToggleVariables = { taskId: string; boardId: string; done: boolean }

/** Tildar/destildar desde la nota. Optimista en la nota y en el tablero de la tarjeta. */
export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId }: ToggleVariables) =>
      api<Task>(`/tasks/${taskId}/toggle-done`, { method: 'POST' }),
    onMutate: async ({ taskId, boardId, done }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      await queryClient.cancelQueries({ queryKey: boardQuery(boardId).queryKey })
      const notes = queryClient.getQueriesData<NotesData>({ queryKey: ['notes'] })
      const board = queryClient.getQueryData(boardQuery(boardId).queryKey)

      queryClient.setQueriesData<NotesData>({ queryKey: ['notes'] }, (data) =>
        mapNotes(data, (list) =>
          list.map((note) => ({
            ...note,
            tasks: note.tasks.map((t) => (t.id === taskId ? { ...t, done: !done } : t)),
          })),
        ),
      )
      queryClient.setQueryData(boardQuery(boardId).queryKey, (detail) =>
        detail ? toggleInBoard(detail, taskId, done) : detail,
      )
      return { notes, board }
    },
    onError: (_error, { boardId }, context) => {
      for (const [key, data] of context?.notes ?? []) queryClient.setQueryData(key, data)
      if (context?.board) queryClient.setQueryData(boardQuery(boardId).queryKey, context.board)
    },
    onSettled: (_task, _error, { boardId }) => {
      void refreshNotes(queryClient)
      void queryClient.invalidateQueries({ queryKey: boardQuery(boardId).queryKey })
      void queryClient.invalidateQueries({ queryKey: boardsQuery.queryKey })
    },
  })
}

/** Lo mismo que hace la API: al final de terminadas o arriba de la primera normal. */
function toggleInBoard(board: BoardDetail, taskId: string, done: boolean): BoardDetail {
  const others = board.tasks.filter((t) => t.id !== taskId)
  const target = done
    ? sortByPosition(board.columns.filter((c) => !c.isDone))[0]
    : board.columns.find((c) => c.isDone)
  if (!target) return board
  const siblings = others.filter((t) => t.columnId === target.id)
  const position = done ? positionBeforeFirst(siblings) : positionAfterLast(siblings)
  return {
    ...board,
    tasks: board.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            columnId: target.id,
            position,
            completedAt: done ? null : new Date().toISOString(),
          }
        : t,
    ),
  }
}
