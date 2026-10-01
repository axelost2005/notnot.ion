import type { BoardDetail, BoardSummary, CreateBoardInput, UpdateBoardInput } from '@notnot/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const boardsQuery = queryOptions({
  queryKey: ['boards'],
  queryFn: () => api<BoardSummary[]>('/boards'),
})

export const boardQuery = (id: string) =>
  queryOptions({
    queryKey: ['board', id],
    queryFn: () => api<BoardDetail>(`/boards/${id}`),
  })

export function useCreateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBoardInput) =>
      api<BoardSummary>('/boards', { method: 'POST', json: input }),
    onSuccess: (board) => {
      queryClient.setQueryData(boardsQuery.queryKey, (boards) => [...(boards ?? []), board])
    },
  })
}

export function useUpdateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateBoardInput & { id: string }) =>
      api<BoardSummary>(`/boards/${id}`, { method: 'PATCH', json: input }),
    onSuccess: (board) => {
      queryClient.setQueryData(boardsQuery.queryKey, (boards) =>
        boards?.map((b) => (b.id === board.id ? board : b)),
      )
      void queryClient.invalidateQueries({ queryKey: boardQuery(board.id).queryKey })
    },
  })
}

export function useDeleteBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/boards/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(boardsQuery.queryKey, (boards) => boards?.filter((b) => b.id !== id))
      queryClient.removeQueries({ queryKey: boardQuery(id).queryKey })
    },
  })
}
