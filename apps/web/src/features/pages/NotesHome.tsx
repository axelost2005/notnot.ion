import { NotebookText } from 'lucide-react'
import { useParams } from 'react-router'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { PanelHeader } from '../home/Panel'
import { NotesSection } from './NotesSection'
import { PageView } from './PageView'

/**
 * `/p` y `/p/:id`: la sección Notas en su panel. En la compu, el árbol a la izquierda y la nota
 * abierta al lado; en el celu, una cosa por vez (la lista o la nota, con "‹" para volver).
 */
export function NotesHome() {
  const { id } = useParams()
  const desktop = useMediaQuery('(min-width: 48rem)')

  if (!desktop) {
    return id ? (
      <PageView />
    ) : (
      <>
        <title>Notas – notnot.ion</title>
        <NotesSection page />
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1">
      <title>Notas – notnot.ion</title>
      <div className="w-72 shrink-0 overflow-y-auto overscroll-y-contain border-r bg-sidebar px-2 pb-4 text-sidebar-foreground [&>nav]:mt-3">
        <NotesSection />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {id ? (
          <PageView />
        ) : (
          <>
            <PanelHeader>
              <NotebookText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <h1 className="text-[15px] font-semibold tracking-tight">Notas</h1>
              <span className="ml-auto" />
            </PanelHeader>
            <div className="grid max-w-sm gap-1 p-6">
              <p className="font-medium">Elegí una nota de la lista.</p>
              <p className="text-[13px] text-muted-foreground">
                O creá una con el «+»: para lo que no es una tarea.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
