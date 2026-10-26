import type {
  BoardDetail,
  Column,
  CreateTaskInput,
  Slot,
  Task,
  UpdateColumnInput,
  UpdateTaskInput,
} from '@notnot/shared'
import { positionForSlot, type Overview } from '@notnot/shared'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { uploadImage } from '@/lib/images'
import { boardQuery, boardsQuery } from '../boards/api'
import { overviewQuery } from '../home/api'
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
      // Que su cuadrado la cuente sin esperar a que se refresque.
      queryClient.setQueryData(
        overviewQuery.queryKey,
        (overview) => overview && { ...overview, tasks: [...overview.tasks, task] },
      )
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

/** Cambia las imágenes de una tarjeta en el cache de su tablero. */
function updateTaskImages(
  queryClient: QueryClient,
  task: Task,
  update: (images: Task['images']) => Task['images'],
) {
  updateBoardCache(queryClient, task.boardId, (board) => ({
    ...board,
    tasks: board.tasks.map((t) => (t.id === task.id ? { ...t, images: update(t.images) } : t)),
  }))
}

/** La achica en el navegador y la sube a la tarjeta. */
export function useAddTaskImage(task: Task) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadImage(`/tasks/${task.id}/images`, file),
    onSuccess: (image) => updateTaskImages(queryClient, task, (images) => [...images, image]),
  })
}

/** Optimista: la miniatura se va al toque y vuelve si la API dice que no. */
export function useDeleteTaskImage(task: Task) {
  const queryClient = useQueryClient()
  const key = boardQuery(task.boardId).queryKey
  return useMutation({
    mutationFn: (imageId: string) => api<void>(`/images/${imageId}`, { method: 'DELETE' }),
    onMutate: async (imageId) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      updateTaskImages(queryClient, task, (images) => images.filter((i) => i.id !== imageId))
      return { previous }
    },
    onError: (_error, _imageId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
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

/**
 * La misma movida en lo del Inicio, que tiene las columnas de todos los tableros: los cuadrados
 * cambian al toque.
 */
function moveInOverview(overview: Overview, variables: MoveTaskVariables): Overview {
  const { task, columnId, boardId, prevId, nextId } = variables
  const column = overview.columns.find((c) => c.id === columnId)
  if (!column) return overview
  const siblings = overview.tasks.filter((t) => t.columnId === columnId && t.id !== task.id)
  // Puede estar atrasado respecto del tablero: sin los vecinos, queda donde estaba hasta refrescar.
  const known = (id: string | null) => id === null || siblings.some((t) => t.id === id)
  const position =
    known(prevId) && known(nextId) ? positionForSlot(siblings, { prevId, nextId }) : task.position
  const completedAt = column.isDone ? (task.completedAt ?? new Date().toISOString()) : null
  return {
    ...overview,
    tasks: overview.tasks.map((t) =>
      t.id === task.id ? { ...t, boardId, columnId, position, completedAt } : t,
    ),
  }
}

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
    onMutate: async (variables) => {
      const { task, columnId, boardId, prevId, nextId } = variables
      const key = boardQuery(task.boardId).queryKey
      await queryClient.cancelQueries({ queryKey: key })
      await queryClient.cancelQueries({ queryKey: overviewQuery.queryKey })
      const previous = queryClient.getQueryData(key)
      const overview = queryClient.getQueryData(overviewQuery.queryKey)
      queryClient.setQueryData(
        overviewQuery.queryKey,
        (data) => data && moveInOverview(data, variables),
      )

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
      return { previous, overview }
    },
    onError: (_error, { task }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardQuery(task.boardId).queryKey, context.previous)
      }
      if (context?.overview) queryClient.setQueryData(overviewQuery.queryKey, context.overview)
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

type DayVariables = { task: Task; day: string | null }

/** El sol y el día del detalle. Optimista en el tablero de la tarea y en el Inicio. */
export function useSetTaskDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ task, day }: DayVariables) =>
      api<Task>(`/tasks/${task.id}`, { method: 'PATCH', json: { day } }),
    onMutate: async ({ task, day }) => {
      const boardKey = boardQuery(task.boardId).queryKey
      await queryClient.cancelQueries({ queryKey: boardKey })
      await queryClient.cancelQueries({ queryKey: overviewQuery.queryKey })
      const board = queryClient.getQueryData(boardKey)
      const overview = queryClient.getQueryData(overviewQuery.queryKey)
      const withDay = (t: Task) => (t.id === task.id ? { ...t, day } : t)
      updateBoardCache(queryClient, task.boardId, (b) => ({ ...b, tasks: b.tasks.map(withDay) }))
      queryClient.setQueryData(
        overviewQuery.queryKey,
        (data) => data && { ...data, tasks: data.tasks.map(withDay) },
      )
      return { board, overview }
    },
    onError: (_error, { task }, context) => {
      if (context?.board) queryClient.setQueryData(boardQuery(task.boardId).queryKey, context.board)
      if (context?.overview) queryClient.setQueryData(overviewQuery.queryKey, context.overview)
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
