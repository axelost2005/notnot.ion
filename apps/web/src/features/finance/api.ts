import type {
  CreatePaymentInput,
  ImageInfo,
  Payment,
  PaymentsSummary,
  UpdatePaymentInput,
} from '@notnot/shared'
import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { uploadImage } from '@/lib/images'

/** Los pagos de un mes ("2026-10"), del más nuevo al más viejo. */
export const paymentsQuery = (month: string) =>
  queryOptions({
    queryKey: ['payments', 'month', month],
    queryFn: () => api<Payment[]>(`/payments?month=${month}`),
  })

/** Los meses con pagos y las categorías ya usadas. */
export const paymentsSummaryQuery = queryOptions({
  queryKey: ['payments', 'summary'],
  queryFn: () => api<PaymentsSummary>('/payments/summary'),
})

/** Un pago nuevo o cambiado puede tocar dos meses, los totales y el resumen: se trae de nuevo. */
const refreshPayments = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: ['payments'] })

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePaymentInput) =>
      api<Payment>('/payments', { method: 'POST', json: input }),
    onSuccess: () => refreshPayments(queryClient),
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdatePaymentInput & { id: string }) =>
      api<Payment>(`/payments/${id}`, { method: 'PATCH', json: input }),
    onSuccess: () => refreshPayments(queryClient),
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/payments/${id}`, { method: 'DELETE' }),
    onSuccess: () => refreshPayments(queryClient),
  })
}

/** Cambia los comprobantes de un pago en el cache de su mes. */
function updateReceipts(
  queryClient: QueryClient,
  payment: Pick<Payment, 'id' | 'date'>,
  update: (images: ImageInfo[]) => ImageInfo[],
) {
  queryClient.setQueryData(paymentsQuery(payment.date.slice(0, 7)).queryKey, (payments) =>
    payments?.map((p) => (p.id === payment.id ? { ...p, images: update(p.images) } : p)),
  )
}

/** Un comprobante (imagen): se achica en el navegador y se sube al pago. */
export function useAddReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ payment, file }: { payment: Pick<Payment, 'id' | 'date'>; file: File }) =>
      uploadImage(`/payments/${payment.id}/images`, file),
    onSuccess: (image, { payment }) =>
      updateReceipts(queryClient, payment, (images) => [...images, image]),
  })
}

type ReceiptVariables = { payment: Pick<Payment, 'id' | 'date'>; imageId: string }

/** Optimista: la miniatura se va al toque y vuelve si la API dice que no. */
export function useDeleteReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ imageId }: ReceiptVariables) =>
      api<void>(`/images/${imageId}`, { method: 'DELETE' }),
    onMutate: async ({ payment, imageId }) => {
      const key = paymentsQuery(payment.date.slice(0, 7)).queryKey
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      updateReceipts(queryClient, payment, (images) => images.filter((i) => i.id !== imageId))
      return { previous }
    },
    onError: (_error, { payment }, context) => {
      const key = paymentsQuery(payment.date.slice(0, 7)).queryKey
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}
