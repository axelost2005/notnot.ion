import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<{ status: string }>('/health'),
    retry: false,
  })

  const status = health.isPending
    ? 'Conectando…'
    : health.data?.status === 'ok'
      ? 'API ok'
      : 'API sin respuesta'

  return (
    <main className="grid min-h-dvh place-content-center gap-2 p-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">notnot.ion</h1>
      <p className="text-sm text-muted-foreground" role="status">
        {status}
      </p>
    </main>
  )
}
