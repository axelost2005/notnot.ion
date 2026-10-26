import { useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { MenuContext } from '@/features/home/navigation'
import { OfflineBanner } from '@/features/pwa/OfflineBanner'
import { Sidebar } from './Sidebar'

/** La barra a la izquierda y la sección al lado. En el celu, la barra sale como hoja con el ☰. */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const opener = useRef<HTMLElement | null>(null)

  function openMenu() {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setMenuOpen(true)
  }

  return (
    <MenuContext value={openMenu}>
      <div className="flex h-dvh flex-col overflow-hidden">
        <OfflineBanner />
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-60 shrink-0 border-r border-sidebar-border md:block">
            <Sidebar />
          </aside>
          <main className="flex min-w-0 flex-1 flex-col">
            <Outlet />
          </main>
        </div>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="left"
            className="gap-0 p-0 data-[side=left]:w-[min(20rem,85vw)]"
            showCloseButton={false}
            // El ☰ no es el trigger de la hoja (va en el encabezado de cada sección): el foco
            // vuelve a él a mano, si sigue en la página.
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              if (opener.current?.isConnected) opener.current.focus()
            }}
          >
            <SheetTitle className="sr-only">Menú</SheetTitle>
            <SheetDescription className="sr-only">Hoy, Tareas, Finanzas y Notas.</SheetDescription>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </MenuContext>
  )
}
