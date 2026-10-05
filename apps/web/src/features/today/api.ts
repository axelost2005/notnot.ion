import type { CreateDayItemsInput, DayItem, UpdateDayItemInput } from '@notnot/shared'
import { splitDayItems } from '@notnot/shared'
import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Todo lo pendiente y lo tachado hoy (la API decide qué es "hoy" con `X-Day-Start`). */
export const dayItemsQuery = queryOptions({
  queryKey: ['day-items'],
  queryFn: () => api<DayItem[]>('/day-items'),
})

/** Recién anotada: todavía no tiene id de la API, así que no se puede tachar ni editar. */
export const isPendingItem = (item: DayItem) => item.id.startsWith('pending-')

const setItems = (queryClient: QueryClient, change: (items: DayItem[]) => DayItem[]) =>
  queryClient.setQueryData(dayItemsQuery.queryKey, (items) => (items ? change(items) : items))

/** Cambia la lista en el cache y devuelve cómo estaba, para volver atrás si la API dice que no. */
async function patchCache(queryClient: QueryClient, change: (items: DayItem[]) => DayItem[]) {
  await queryClient.cancelQueries({ queryKey: dayItemsQuery.queryKey })
  const previous = queryClient.getQueryData(dayItemsQuery.queryKey)
  setItems(queryClient, change)
  return { previous }
}

/** Si la API dice que no, la lista vuelve a como estaba y se trae de nuevo. */
function rollback(queryClient: QueryClient, context?: { previous: DayItem[] | undefined }) {
  if (context?.previous) queryClient.setQueryData(dayItemsQuery.queryKey, context.previous)
  void queryClient.invalidateQueries({ queryKey: dayItemsQuery.queryKey })
}

/** Optimista: lo escrito aparece al toque, una cosa por línea, y se va si la API dice que no. */
export function useCreateDayItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDayItemsInput) =>
      api<DayItem[]>('/day-items', { method: 'POST', json: input }),
    onMutate: async ({ day, text }) => {
      const now = Date.now()
      const pending = splitDayItems(text).map((line, index): DayItem => {
        const createdAt = new Date(now + index).toISOString()
        return {
          id: `pending-${crypto.randomUUID()}`,
          day,
          text: line,
          doneAt: null,
          createdAt,
          updatedAt: createdAt,
        }
      })
      const { previous } = await patchCache(queryClient, (items) => [...items, ...pending])
      return { previous, pendingIds: new Set(pending.map((item) => item.id)) }
    },
    onSuccess: (created, _input, context) =>
      setItems(queryClient, (items) => [
        ...items.filter((item) => !context.pendingIds.has(item.id)),
        ...created,
      ]),
    onError: (_error, _input, context) => rollback(queryClient, context),
  })
}

type UpdateVariables = UpdateDayItemInput & { id: string }

/** Optimista: tachar, editar y mover se ven al toque y vuelven si la API dice que no. */
export function useUpdateDayItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateVariables) =>
      api<DayItem>(`/day-items/${id}`, { method: 'PATCH', json: input }),
    onMutate: ({ id, text, day, done }) =>
      patchCache(queryClient, (items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                text: text ?? item.text,
                day: day ?? item.day,
                doneAt: done === undefined ? item.doneAt : done ? new Date().toISOString() : null,
              }
            : item,
        ),
      ),
    onSuccess: (updated) =>
      setItems(queryClient, (items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      ),
    onError: (_error, _input, context) => rollback(queryClient, context),
  })
}

export function useDeleteDayItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/day-items/${id}`, { method: 'DELETE' }),
    onMutate: (id) => patchCache(queryClient, (items) => items.filter((item) => item.id !== id)),
    onError: (_error, _id, context) => rollback(queryClient, context),
  })
}
