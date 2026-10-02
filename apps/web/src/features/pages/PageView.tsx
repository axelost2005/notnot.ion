import type { Folder, Page } from '@notnot/shared'
import { folderPath, LIMITS } from '@notnot/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Ellipsis, FolderInput, NotebookText, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/lib/api'
import { pageQuery, pagesTreeQuery, useDeletePage, useUpdatePage } from './api'
import { MoveDialog, type Movable } from './MoveDialog'
import { openFolders } from './openFolders'

/** `/p/:id`: una nota de la sección Notas. */
export function PageView() {
  const { id = '' } = useParams()
  const page = useQuery(pageQuery(id))
  const tree = useQuery(pagesTreeQuery)

  if (page.isPending) return <PageSkeleton />
  if (page.isError) {
    if (isApiError(page.error, 404) || isApiError(page.error, 400)) return <PageNotFound />
    return (
      <ErrorState
        title="No se pudo cargar la nota."
        message={page.error.message}
        onRetry={() => void page.refetch()}
      />
    )
  }
  // Una por nota: el texto que se está escribiendo vive en el editor, no en el cache.
  return <PageEditor key={page.data.id} page={page.data} folders={tree.data?.folders ?? []} />
}

type Draft = { title: string; content: string }
type SaveState = 'saved' | 'saving' | 'error'

/** Guarda un rato después de la última tecla. */
const SAVE_DELAY_MS = 800

/** Lo que cambió entre lo guardado y lo escrito (el título se guarda sin espacios de más). */
function changesBetween(saved: Draft, draft: Draft): Partial<Draft> | null {
  const changes: Partial<Draft> = {}
  if (draft.title.trim() !== saved.title) changes.title = draft.title.trim()
  if (draft.content !== saved.content) changes.content = draft.content
  return Object.keys(changes).length > 0 ? changes : null
}

function wantsTitleFocus(state: unknown) {
  return typeof state === 'object' && state !== null && 'focusTitle' in state && !!state.focusTitle
}

function PageEditor({ page, folders }: { page: Page; folders: Folder[] }) {
  const queryClient = useQueryClient()
  const { mutate } = useUpdatePage({ silent: true })
  const location = useLocation()
  const [draft, setDraft] = useState<Draft>({ title: page.title, content: page.content })
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const saved = useRef<Draft>({ title: page.title, content: page.content })
  const latest = useRef<Draft>(draft)
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const save = useCallback(() => {
    const changes = changesBetween(saved.current, latest.current)
    if (!changes) return
    const before = saved.current
    saved.current = { ...saved.current, ...changes }
    // Si se vuelve a esta nota antes de que la API conteste, se ve lo último que se escribió.
    queryClient.setQueryData(pageQuery(page.id).queryKey, (old) => old && { ...old, ...changes })
    mutate(
      { id: page.id, ...changes },
      {
        onSuccess: () => {
          if (!changesBetween(saved.current, latest.current)) setSaveState('saved')
        },
        onError: () => {
          // Con la próxima tecla se vuelve a intentar.
          saved.current = before
          setSaveState('error')
        },
      },
    )
  }, [mutate, page.id, queryClient])

  useEffect(() => {
    latest.current = draft
    if (!changesBetween(saved.current, draft)) return
    const timer = window.setTimeout(save, SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [draft, save])

  // Al ir a otra nota, al esconder la pestaña o al cerrar la app, lo pendiente se guarda ya.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      save()
    }
  }, [save])

  // "Renombrar" desde el árbol o una nota nueva: el título queda elegido.
  const focusTitle = wantsTitleFocus(location.state)
  useEffect(() => {
    if (!focusTitle) return
    titleRef.current?.focus()
    titleRef.current?.select()
  }, [focusTitle, location.key])

  // Que en el árbol se vea dónde está.
  useEffect(() => {
    openFolders(folderPath(folders, page.folderId).map((folder) => folder.id))
  }, [folders, page.folderId])

  function edit(change: Partial<Draft>) {
    const next = { ...draft, ...change }
    setDraft(next)
    setSaveState(changesBetween(saved.current, next) ? 'saving' : 'saved')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <title>{`${draft.title.trim() || 'Sin título'} – notnot.ion`}</title>
      <PageHeader page={page} folders={folders} saveState={saveState} />
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-6 pt-8 max-md:px-4 max-md:pt-5">
        <input
          ref={titleRef}
          value={draft.title}
          maxLength={LIMITS.pageTitle}
          placeholder="Sin título"
          aria-label="Título"
          onChange={(event) => edit({ title: event.target.value })}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            contentRef.current?.focus()
          }}
          className="w-full bg-transparent text-[clamp(1.375rem,1.1rem+1vw,1.75rem)] leading-tight font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
        />
        <textarea
          ref={contentRef}
          value={draft.content}
          maxLength={LIMITS.pageContent}
          placeholder="Escribí lo que quieras guardar."
          aria-label="Texto"
          onChange={(event) => edit({ content: event.target.value })}
          className="mt-4 min-h-0 w-full flex-1 resize-none bg-transparent pb-8 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
        />
      </div>
    </div>
  )
}

const SAVE_LABELS: Record<SaveState, string> = {
  saved: 'Guardado',
  saving: 'Guardando…',
  error: 'No se pudo guardar',
}

function PageHeader({
  page,
  folders,
  saveState,
}: {
  page: Page
  folders: Folder[]
  saveState: SaveState
}) {
  const navigate = useNavigate()
  const move = useUpdatePage()
  const remove = useDeletePage()
  const [moving, setMoving] = useState<Movable | null>(null)
  const [deleting, setDeleting] = useState(false)
  const path = folderPath(folders, page.folderId)
  const name = page.title || 'Sin título'

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 max-md:px-2">
      {/* En el celu, de vuelta a la lista de notas (la de la barra de abajo). */}
      <Button asChild variant="ghost" size="icon" className="text-muted-foreground md:hidden">
        <Link to="/p" aria-label="Volver a Notas">
          <ChevronLeft />
        </Link>
      </Button>
      <nav
        aria-label="Ubicación"
        className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground"
      >
        <NotebookText aria-hidden="true" className="size-4 shrink-0 max-md:hidden" />
        <span className="shrink-0">Notas</span>
        {path.map((folder) => (
          <span key={folder.id} className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <span className="truncate">{folder.name}</span>
          </span>
        ))}
      </nav>

      <span
        role="status"
        className="ml-auto shrink-0 text-xs text-muted-foreground data-[state=error]:text-destructive"
        data-state={saveState}
      >
        {SAVE_LABELS[saveState]}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Opciones de esta nota">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={() => setMoving({ kind: 'page', id: page.id, name, parentId: page.folderId })}
          >
            <FolderInput />
            Mover a…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2 />
            Borrar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MoveDialog
        item={moving}
        folders={folders}
        onMove={(item, folderId) => move.mutateAsync({ id: item.id, folderId })}
        onClose={() => setMoving(null)}
      />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar la nota «{name}»?</AlertDialogTitle>
            <AlertDialogDescription>Se borra para siempre.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(page.id, {
                  onSuccess: () => void navigate('/p', { replace: true }),
                })
              }
            >
              Borrar la nota
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}

function PageNotFound() {
  return (
    <div className="grid max-w-sm gap-2 p-6">
      <title>Nota no encontrada – notnot.ion</title>
      <p className="font-medium">Esta nota no existe.</p>
      <p className="text-[13px] text-muted-foreground">Puede que la hayan borrado.</p>
      <Button asChild variant="outline" size="sm" className="mt-2 justify-self-start">
        <Link to="/p">Ir a Notas</Link>
      </Button>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 items-center border-b px-4">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="mx-auto grid w-full max-w-2xl gap-4 px-6 pt-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}
