import { createBrowserRouter, Navigate } from 'react-router'
import { BoardPage } from '@/features/boards/BoardPage'
import { RootRedirect } from '@/features/boards/RootRedirect'
import { UnlockPage } from '@/features/lock/UnlockPage'
import { NotesWindow } from '@/features/notes/NotesWindow'
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
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
