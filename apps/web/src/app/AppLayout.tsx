import { useState } from 'react'
import { Outlet } from 'react-router'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from '@/features/boards/Sidebar'
import { OfflineBanner } from '@/features/pwa/OfflineBanner'
import type { LayoutContext } from './layoutContext'
import { MobileNav } from './MobileNav'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

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
      <MobileNav menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />

      {/* En mobile, la sidebar se abre desde "Menú" abajo o desde el título de un tablero. */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="gap-0 p-0 data-[side=left]:w-[min(20rem,85vw)]"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <SheetDescription className="sr-only">Tableros, notas y finanzas.</SheetDescription>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
