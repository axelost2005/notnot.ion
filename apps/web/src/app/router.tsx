import { createBrowserRouter, Navigate } from 'react-router'
import { BoardPage } from '@/features/boards/BoardPage'
import { RootRedirect } from '@/features/boards/RootRedirect'
import { UnlockPage } from '@/features/lock/UnlockPage'
import { FinanceRedirect, FinanceView } from '@/features/finance/FinanceView'
import { NotesWindow } from '@/features/notes/NotesWindow'
import { PageView } from '@/features/pages/PageView'
import { AppLayout } from './AppLayout'
import { SessionGate } from './SessionGate'

export const router = createBrowserRouter([
  { path: '/unlock', Component: UnlockPage },
  {
    Component: SessionGate,
    children: [
      // La ventana de notas va sin sidebar: solo el panel.
      { path: 'notas/:slug', Component: NotesWindow },
      {
        Component: AppLayout,
        children: [
          { index: true, Component: RootRedirect },
          { path: 'b/:slug', Component: BoardPage },
          // Una nota de la sección Notas (`/notas/:slug` es la ventana de notas de un tablero).
          { path: 'p/:id', Component: PageView },
          { path: 'finanzas', Component: FinanceRedirect },
          { path: 'finanzas/:month', Component: FinanceView },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
