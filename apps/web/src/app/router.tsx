import { createBrowserRouter, Navigate } from 'react-router'
import { BoardPage } from '@/features/boards/BoardPage'
import { FinanceRedirect, FinanceView } from '@/features/finance/FinanceView'
import { ReceivablesView } from '@/features/finance/ReceivablesView'
import { NewNoteShortcut } from '@/features/home/NewNoteShortcut'
import { TasksHome } from '@/features/home/TasksHome'
import { UnlockPage } from '@/features/lock/UnlockPage'
import { NotesWindow } from '@/features/notes/NotesWindow'
import { NotesHome } from '@/features/pages/NotesHome'
import { TodayPanel } from '@/features/today/TodayPanel'
import { AppLayout } from './AppLayout'
import { SessionGate } from './SessionGate'

export const router = createBrowserRouter([
  { path: '/unlock', Component: UnlockPage },
  {
    Component: SessionGate,
    children: [
      // La ventana de notas va sola: solo el panel de notas.
      { path: 'notas/:slug', Component: NotesWindow },
      {
        // La barra y, al lado, la sección elegida.
        Component: AppLayout,
        children: [
          {
            // Tareas, con el panel del tablero abierto encima.
            path: '/',
            Component: TasksHome,
            children: [
              { index: true, Component: NewNoteShortcut },
              { path: 'b/:slug', Component: BoardPage },
            ],
          },
          { path: 'hoy', Component: TodayPanel },
          // La sección Notas y una de sus notas (`/notas/:slug` es la ventana de notas de un tablero).
          { path: 'p', Component: NotesHome },
          { path: 'p/:id', Component: NotesHome },
          { path: 'finanzas', Component: FinanceRedirect },
          { path: 'finanzas/por-cobrar', Component: ReceivablesView },
          { path: 'finanzas/:month', Component: FinanceView },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
