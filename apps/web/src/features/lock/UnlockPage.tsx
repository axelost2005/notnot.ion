import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUnlock } from './api'

function fromPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state
    if (typeof from === 'string' && from.startsWith('/') && from !== '/unlock') return from
  }
  return '/'
}

export function UnlockPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const unlock = useUnlock()
  const [code, setCode] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    unlock.mutate(
      { code },
      { onSuccess: () => void navigate(fromPath(location.state), { replace: true }) },
    )
  }

  const error = unlock.error?.message

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <form onSubmit={onSubmit} className="flex w-full max-w-72 flex-col gap-6" noValidate>
        <div className="flex items-center gap-2">
          <BrandMark className="size-5" />
          <h1 className="text-lg font-semibold tracking-tight">notnot.ion</h1>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'code-error' : 'code-hint'}
            className="h-9"
          />
          {error ? (
            <p id="code-error" role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          ) : (
            <p id="code-hint" className="text-[13px] text-muted-foreground">
              Se pide una vez por dispositivo.
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={unlock.isPending || code.trim() === ''}>
          {unlock.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
