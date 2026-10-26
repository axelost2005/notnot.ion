import { NotebookText } from 'lucide-react'
import { useParams } from 'react-router'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { PanelHeader } from '../home/Panel'
import { NotesSection } from './NotesSection'
import { PageView } from './PageView'

/**
 * `/p` y `/p/:id`: la sección Notas. En la compu el árbol está en la barra y acá va la nota
 * abierta; en el celu, una cosa por vez (la lista o la nota, con "‹" para volver).
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

  if (id) return <PageView />

  return (
    <>
      <title>Notas – notnot.ion</title>
      <PanelHeader>
        <NotebookText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <h1 className="text-[15px] font-semibold tracking-tight">Notas</h1>
      </PanelHeader>
      <div className="grid max-w-sm gap-1 p-6">
        <p className="font-medium">Elegí una nota de la barra o creá una con el «+».</p>
        <p className="text-[13px] text-muted-foreground">Para lo que no es una tarea.</p>
      </div>
    </>
  )
}
