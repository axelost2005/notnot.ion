import type {
  BoardDetail,
  Column,
  CreateTaskInput,
  Slot,
  Task,
  UpdateColumnInput,
  UpdateTaskInput,
} from '@notnot/shared'
import { positionForSlot } from '@notnot/shared'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { boardQuery, boardsQuery } from '../boards/api'
import { refreshNotes } from '../notes/api'

function updateBoardCache(
  queryClient: QueryClient,
  boardId: string,
  update: (board: BoardDetail) => BoardDetail,
) {
  queryClient.setQueryData(boardQuery(boardId).queryKey, (board) => board && update(board))
}

/** Los contadores de abiertas de la sidebar cambian cuando se crean, mueven o borran tarjetas. */
const refreshCounts = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: boardsQuery.queryKey })

export function useCreateTask(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api<Task>('/tasks', { method: 'POST', json: input }),
    onSuccess: (task) => {
      updateBoardCache(queryClient, boardId, (board) => ({
        ...board,
        tasks: [...board.tasks, task],
      }))
      void refreshCounts(queryClient)
    },
  })
}

export function useUpdateTask(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...changes }: UpdateTaskInput & { id: string }) =>
      api<Task>(`/tasks/${id}`, { method: 'PATCH', json: changes }),
    onSuccess: (task) => {
      updateBoardCache(queryClient, boardId, (board) => ({
        ...board,
        tasks: board.tasks.map((t) => (t.id === task.id ? task : t)),
      }))
      void refreshNotes(queryClient)
    },
  })
}

export function useDeleteTask(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      updateBoardCache(queryClient, boardId, (board) => ({
        ...board,
        tasks: board.tasks.filter((t) => t.id !== id),
      }))
      void refreshCounts(queryClient)
      void refreshNotes(queryClient)
    },
  })
}

export type MoveTaskVariables = Slot & {
  task: Task
  columnId: string
  /** Si es otro tablero, la tarjeta se va de este. */
  boardId: string
}

const MOVE_KEY = ['move-task']

/** Optimista: la tarjeta cambia de lugar al toque y vuelve si la API dice que no. */
export function useMoveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: MOVE_KEY,
    mutationFn: ({ task, columnId, boardId, prevId, nextId }: MoveTaskVariables) =>
      api<Task>(`/tasks/${task.id}/move`, {
        method: 'POST',
        json: { columnId, boardId, prevId, nextId },
      }),
    onMutate: async ({ task, columnId, boardId, prevId, nextId }) => {
      const key = boardQuery(task.boardId).queryKey
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)

      updateBoardCache(queryClient, task.boardId, (board) => {
        if (boardId !== task.boardId) {
          return { ...board, tasks: board.tasks.filter((t) => t.id !== task.id) }
        }
        const column = board.columns.find((c) => c.id === columnId)
        if (!column) return board
        const siblings = board.tasks.filter((t) => t.columnId === columnId && t.id !== task.id)
        const position = positionForSlot(siblings, { prevId, nextId })
        const completedAt = column.isDone ? (task.completedAt ?? new Date().toISOString()) : null
        return {
          ...board,
          tasks: board.tasks.map((t) =>
            t.id === task.id ? { ...t, columnId, position, completedAt } : t,
          ),
        }
      })
      return { previous }
    },
    onError: (_error, { task }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardQuery(task.boardId).queryKey, context.previous)
      }
    },
    onSuccess: (moved, { task }) => {
      if (moved.boardId !== task.boardId) return
      updateBoardCache(queryClient, task.boardId, (board) => ({
        ...board,
        tasks: board.tasks.map((t) => (t.id === moved.id ? moved : t)),
      }))
    },
    onSettled: (_moved, _error, { task, boardId }) => {
      void refreshCounts(queryClient)
      void refreshNotes(queryClient)
      if (boardId !== task.boardId) {
        void queryClient.invalidateQueries({ queryKey: boardQuery(boardId).queryKey })
      }
      // Con varios movimientos en vuelo, refrescar en el medio pisaría los optimistas.
      if (queryClient.isMutating({ mutationKey: MOVE_KEY }) === 1) {
        void queryClient.invalidateQueries({ queryKey: boardQuery(task.boardId).queryKey })
      }
    },
  })
}

export function useCreateColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api<Column>(`/boards/${boardId}/columns`, { method: 'POST', json: { name } }),
    onSuccess: (column) => {
      updateBoardCache(queryClient, boardId, (board) => ({
        ...board,
        columns: [...board.columns, column],
      }))
    },
  })
}

export function useUpdateColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...changes }: UpdateColumnInput & { id: string }) =>
      api<Column>(`/columns/${id}`, { method: 'PATCH', json: changes }),
    onSuccess: (column, { isDone }) => {
      if (isDone) {
        // Cambiaron dos columnas y las fechas de terminadas: mejor traer todo de nuevo.
        void queryClient.invalidateQueries({ queryKey: boardQuery(boardId).queryKey })
        void refreshCounts(queryClient)
        void refreshNotes(queryClient)
        return
      }
      updateBoardCache(queryClient, boardId, (board) => ({
        ...board,
        columns: board.columns.map((c) => (c.id === column.id ? column : c)),
      }))
    },
  })
}

export function useDeleteColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/columns/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      updateBoardCache(queryClient, boardId, (board) => ({
        ...board,
        columns: board.columns.filter((c) => c.id !== id),
      }))
    },
  })
}
