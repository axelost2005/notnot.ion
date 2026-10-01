import type { UnlockInput } from '@notnot/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { api } from '@/lib/api'

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => api<{ unlocked: true }>('/session'),
  staleTime: Infinity,
  retry: false,
})

export function useUnlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UnlockInput) => api<void>('/unlock', { method: 'POST', json: input }),
    meta: { inlineError: true },
    onSuccess: () => {
      queryClient.removeQueries()
      queryClient.setQueryData(sessionQuery.queryKey, { unlocked: true })
    },
  })
}

export function useLock() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => api<void>('/lock', { method: 'POST' }),
    onSuccess: async () => {
      await navigate('/unlock', { replace: true })
      queryClient.removeQueries()
    },
  })
}
