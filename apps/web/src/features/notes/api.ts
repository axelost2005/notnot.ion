import type { BoardSummary, Column, Note, NotesPage, Task } from '@notnot/shared'
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
import { generalQuery } from '../general/api'

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
          archived: false,
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

/**
 * Tildar/destildar desde la nota o desde la tarjeta. Optimista en las notas, en el tablero de
 * la tarjeta y en General.
 */
export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId }: ToggleVariables) =>
      api<Task>(`/tasks/${taskId}/toggle-done`, { method: 'POST' }),
    onMutate: async ({ taskId, boardId, done }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      await queryClient.cancelQueries({ queryKey: boardQuery(boardId).queryKey })
      await queryClient.cancelQueries({ queryKey: generalQuery.queryKey })
      const notes = queryClient.getQueriesData<NotesData>({ queryKey: ['notes'] })
      const board = queryClient.getQueryData(boardQuery(boardId).queryKey)
      const general = queryClient.getQueryData(generalQuery.queryKey)

      queryClient.setQueriesData<NotesData>({ queryKey: ['notes'] }, (data) =>
        mapNotes(data, (list) =>
          list.map((note) => ({
            ...note,
            // Tildar o destildar la saca del historial (si estaba).
            tasks: note.tasks.map((t) =>
              t.id === taskId ? { ...t, done: !done, archived: false } : t,
            ),
          })),
        ),
      )
      queryClient.setQueryData(
        boardQuery(boardId).queryKey,
        (detail) => detail && toggleIn(detail, taskId, boardId, done),
      )
      queryClient.setQueryData(
        generalQuery.queryKey,
        (data) => data && toggleIn(data, taskId, boardId, done),
      )
      return { notes, board, general }
    },
    onError: (_error, { boardId }, context) => {
      for (const [key, data] of context?.notes ?? []) queryClient.setQueryData(key, data)
      if (context?.board) queryClient.setQueryData(boardQuery(boardId).queryKey, context.board)
      if (context?.general) queryClient.setQueryData(generalQuery.queryKey, context.general)
    },
    onSettled: (_task, _error, { boardId }) => {
      void refreshNotes(queryClient)
      void queryClient.invalidateQueries({ queryKey: boardQuery(boardId).queryKey })
      void queryClient.invalidateQueries({ queryKey: boardsQuery.queryKey })
      // Si estaba en el historial, sale de ahí.
      void queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })
}

/**
 * Lo mismo que hace la API: al final de terminadas o arriba de la primera normal. Sirve para un
 * tablero y para General (que tiene las columnas de todos).
 */
function toggleIn<T extends { columns: Column[]; tasks: Task[] }>(
  data: T,
  taskId: string,
  boardId: string,
  done: boolean,
): T {
  const columns = data.columns.filter((c) => c.boardId === boardId)
  const target = done
    ? sortByPosition(columns.filter((c) => !c.isDone))[0]
    : columns.find((c) => c.isDone)
  if (!target) return data
  const siblings = data.tasks.filter((t) => t.columnId === target.id && t.id !== taskId)
  const position = done ? positionBeforeFirst(siblings) : positionAfterLast(siblings)
  return {
    ...data,
    tasks: data.tasks.map((t) =>
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
