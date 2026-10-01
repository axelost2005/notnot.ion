import type { HistoryPage } from '@notnot/shared'
import { infiniteQueryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Sin `boardId`, el historial de todos los tableros. */
export const historyQuery = (boardId?: string) =>
  infiniteQueryOptions({
    queryKey: ['history', boardId ?? 'todos'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (boardId) params.set('boardId', boardId)
      if (pageParam) params.set('before', pageParam)
      const query = params.toString()
      return api<HistoryPage>(`/history${query ? `?${query}` : ''}`)
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
