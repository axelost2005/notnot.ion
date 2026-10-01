import type {
  CreateFolderInput,
  CreatePageInput,
  Folder,
  Page,
  PagesTree,
  UpdateFolderInput,
  UpdatePageInput,
} from '@notnot/shared'
import { descendantFolderIds } from '@notnot/shared'
import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Todo el árbol de la sección Notas (las notas sin su texto). */
export const pagesTreeQuery = queryOptions({
  queryKey: ['pages', 'tree'],
  queryFn: () => api<PagesTree>('/folders'),
})

export const pageQuery = (id: string) =>
  queryOptions({
    queryKey: ['pages', 'page', id],
    queryFn: () => api<Page>(`/pages/${id}`),
  })

function updateTree(queryClient: QueryClient, update: (tree: PagesTree) => PagesTree) {
  queryClient.setQueryData(pagesTreeQuery.queryKey, (tree) => tree && update(tree))
}

const summaryOf = ({ id, folderId, title, updatedAt }: Page) => ({ id, folderId, title, updatedAt })

export function useCreateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFolderInput) =>
      api<Folder>('/folders', { method: 'POST', json: input }),
    onSuccess: (folder) =>
      updateTree(queryClient, (tree) => ({ ...tree, folders: [...tree.folders, folder] })),
  })
}

/** Renombrar o mover (`parentId`). */
export function useUpdateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateFolderInput & { id: string }) =>
      api<Folder>(`/folders/${id}`, { method: 'PATCH', json: input }),
    onSuccess: (folder) =>
      updateTree(queryClient, (tree) => ({
        ...tree,
        folders: tree.folders.map((f) => (f.id === folder.id ? folder : f)),
      })),
  })
}

/** Se lleva lo de adentro: se saca del árbol todo lo que colgaba de ella. */
export function useDeleteFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/folders/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      const tree = queryClient.getQueryData(pagesTreeQuery.queryKey)
      if (!tree) return
      const gone = descendantFolderIds(tree.folders, id).add(id)
      const inside = (folderId: string | null) => folderId !== null && gone.has(folderId)
      for (const page of tree.pages) {
        if (inside(page.folderId)) {
          queryClient.removeQueries({ queryKey: pageQuery(page.id).queryKey })
        }
      }
      queryClient.setQueryData(pagesTreeQuery.queryKey, {
        folders: tree.folders.filter((f) => !gone.has(f.id)),
        pages: tree.pages.filter((p) => !inside(p.folderId)),
      })
    },
  })
}

export function useCreatePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePageInput) => api<Page>('/pages', { method: 'POST', json: input }),
    onSuccess: (page) => {
      queryClient.setQueryData(pageQuery(page.id).queryKey, page)
      updateTree(queryClient, (tree) => ({ ...tree, pages: [...tree.pages, summaryOf(page)] }))
    },
  })
}

/**
 * Título, texto o carpeta. El guardado automático mientras se escribe va `silent`: no avisa a
 * las otras ventanas ni refresca General en cada tecla.
 */
export function useUpdatePage({ silent = false } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdatePageInput & { id: string }) =>
      api<Page>(`/pages/${id}`, {
        method: 'PATCH',
        json: input,
        // Termina aunque se cierre la pestaña (el navegador lo permite hasta 64 kB).
        keepalive: new Blob([JSON.stringify(input)]).size < 60_000,
      }),
    meta: { silent },
    onSuccess: (page) => {
      queryClient.setQueryData(pageQuery(page.id).queryKey, page)
      updateTree(queryClient, (tree) => ({
        ...tree,
        pages: tree.pages.map((p) => (p.id === page.id ? summaryOf(page) : p)),
      }))
    },
  })
}

export function useDeletePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/pages/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: pageQuery(id).queryKey })
      updateTree(queryClient, (tree) => ({
        ...tree,
        pages: tree.pages.filter((p) => p.id !== id),
      }))
    },
  })
}
