import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isApiError } from '@/lib/api'
import { router } from './router'

declare module '@tanstack/react-query' {
  interface Register {
    // `inlineError`: la pantalla ya muestra el error, no hace falta toast.
    mutationMeta: { inlineError?: boolean }
  }
}

/** Un 401 en cualquier pedido significa que el candado está cerrado: a /unlock. */
function handleUnauthorized(error: unknown): boolean {
  if (!isApiError(error, 401)) return false
  if (router.state.location.pathname === '/unlock') return true
  void router.navigate('/unlock', { replace: true }).then(() => queryClient.removeQueries())
  return true
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (handleUnauthorized(error)) return
      // La primera carga muestra su error en pantalla; un refetch que falla, con un toast.
      if (query.state.data !== undefined) toast.error(error.message)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (handleUnauthorized(error) || mutation.meta?.inlineError) return
      toast.error(error.message)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (failureCount, error) =>
        isApiError(error) && error.status >= 400 && error.status < 500 ? false : failureCount < 2,
    },
  },
})
