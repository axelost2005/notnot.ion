import { Button } from '@/components/ui/button'

type Props = {
  title: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({ title, message, onRetry }: Props) {
  return (
    <div role="alert" className="grid max-w-sm gap-1.5 p-6">
      <p className="font-medium">{title}</p>
      {message && <p className="text-[13px] text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2 justify-self-start" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
