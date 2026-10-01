import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { BrandMark } from '@/components/BrandMark'
import { ErrorState } from '@/components/ErrorState'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from '@/features/boards/Sidebar'
import { sessionQuery } from '@/features/lock/api'
import { OfflineBanner } from '@/features/pwa/OfflineBanner'
import { isApiError } from '@/lib/api'
import type { LayoutContext } from './layoutContext'

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

  const context: LayoutContext = { openBoardsMenu: () => setMenuOpen(true) }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <OfflineBanner />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border md:block">
          <Sidebar />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <Outlet context={context} />
        </main>
      </div>

      {/* En mobile, la lista de tableros se abre desde el header del tablero. */}
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
