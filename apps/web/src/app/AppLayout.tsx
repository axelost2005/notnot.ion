import { useQuery } from '@tanstack/react-query'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { BrandMark } from '@/components/BrandMark'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from '@/features/boards/Sidebar'
import { sessionQuery } from '@/features/lock/api'
import { isApiError } from '@/lib/api'

export function AppLayout() {
  const session = useQuery(sessionQuery)
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  if (session.isPending) {
    return (
      <div className="grid h-dvh place-items-center text-muted-foreground" aria-label="Cargando">
        <BrandMark className="size-5 animate-pulse" />
      </div>
    )
  }

  if (session.isError) {
    if (isApiError(session.error, 401)) {
      return <Navigate to="/unlock" replace state={{ from: location.pathname }} />
    }
    return (
      <ErrorState
        title="No hay conexión con el servidor."
        message={session.error.message}
        onRetry={() => void session.refetch()}
      />
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border md:block">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b px-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir tableros"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <BrandMark />
          <span className="font-semibold tracking-tight">notnot.ion</span>
        </div>
        <main className="min-h-0 flex-1">
          <Outlet />
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 gap-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Tableros</SheetTitle>
          <SheetDescription className="sr-only">
            Elegí un tablero o creá uno nuevo.
          </SheetDescription>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
