import type { GeneralBoard } from '@notnot/shared'
import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Lo de todos los tableros activos. Cualquier cambio lo invalida (ver `queryClient`). */
export const generalQuery = queryOptions({
  queryKey: ['general'],
  queryFn: () => api<GeneralBoard>('/general'),
})
