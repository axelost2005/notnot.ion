import { createBrowserRouter, Navigate } from 'react-router'
import { BoardPage } from '@/features/boards/BoardPage'
import { RootRedirect } from '@/features/boards/RootRedirect'
import { UnlockPage } from '@/features/lock/UnlockPage'
import { AppLayout } from './AppLayout'

export const router = createBrowserRouter([
  { path: '/unlock', Component: UnlockPage },
  {
    Component: AppLayout,
    children: [
      { index: true, Component: RootRedirect },
      { path: 'b/:slug', Component: BoardPage },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
