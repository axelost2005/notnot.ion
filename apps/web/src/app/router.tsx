import { createBrowserRouter, Navigate } from 'react-router'
import { BoardPage } from '@/features/boards/BoardPage'
import { RootRedirect } from '@/features/boards/RootRedirect'
import { UnlockPage } from '@/features/lock/UnlockPage'
import { FinanceRedirect, FinanceView } from '@/features/finance/FinanceView'
import { ReceivablesView } from '@/features/finance/ReceivablesView'
import { NotesWindow } from '@/features/notes/NotesWindow'
import { NotesHome } from '@/features/pages/NotesHome'
import { PageView } from '@/features/pages/PageView'
import { TodayView } from '@/features/today/TodayView'
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
          { path: 'hoy', Component: TodayView },
          { path: 'b/:slug', Component: BoardPage },
          // La sección Notas y una de sus notas (`/notas/:slug` es la ventana de notas de un tablero).
          { path: 'p', Component: NotesHome },
          { path: 'p/:id', Component: PageView },
          { path: 'finanzas', Component: FinanceRedirect },
          { path: 'finanzas/por-cobrar', Component: ReceivablesView },
          { path: 'finanzas/:month', Component: FinanceView },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
