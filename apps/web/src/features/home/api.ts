import type { Overview, Task } from '@notnot/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { boardQuery, boardsQuery } from '../boards/api'

/** Lo de todos los tableros activos: los cuadrados del Inicio y Hoy. Cualquier cambio lo invalida. */
export const overviewQuery = queryOptions({
  queryKey: ['overview'],
  queryFn: () => api<Overview>('/overview'),
})

export type CaptureItem = { columnId: string; title: string; day: string | null }

/** "Anotar…": una tarea por línea, cada una al final de la primera columna de su tablero. */
export function useCaptureTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    // De a una, en orden: así quedan en el orden de las líneas.
    mutationFn: async (items: CaptureItem[]) => {
      const created: Task[] = []
      for (const item of items)
        created.push(await api<Task>('/tasks', { method: 'POST', json: item }))
      return created
    },
    onSuccess: (created) => {
      queryClient.setQueryData(
        overviewQuery.queryKey,
        (overview) => overview && { ...overview, tasks: [...overview.tasks, ...created] },
      )
      for (const boardId of new Set(created.map((task) => task.boardId))) {
        void queryClient.invalidateQueries({ queryKey: boardQuery(boardId).queryKey })
      }
      void queryClient.invalidateQueries({ queryKey: boardsQuery.queryKey })
    },
  })
}
