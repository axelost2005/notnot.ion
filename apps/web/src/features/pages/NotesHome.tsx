import { NotesSection } from './NotesSection'

/** `/p`: la sección Notas a pantalla completa. En el celu se abre con "Notas" de la barra de abajo. */
export function NotesHome() {
  return (
    <>
      <title>Notas – notnot.ion</title>
      <NotesSection page />
    </>
  )
}
