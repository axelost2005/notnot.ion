import type { Folder, PageSummary, PagesTree } from '@notnot/shared'
import {
  compareNames,
  compareTitles,
  descendantFolderIds,
  folderNameSchema,
  LIMITS,
} from '@notnot/shared'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight,
  Ellipsis,
  FilePlus,
  FileText,
  Folder as FolderIcon,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router'
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
import { cn } from '@/lib/utils'
import {
  pagesTreeQuery,
  useCreateFolder,
  useCreatePage,
  useDeleteFolder,
  useDeletePage,
  useUpdateFolder,
  useUpdatePage,
} from './api'
import { FOLDER_ICON_OPTIONS } from './folderIcons'
import { FolderGlyph, FolderStyleDialog } from './FolderStyleDialog'
import { MoveDialog, type Movable } from './MoveDialog'
import { setFolderOpen, useOpenFolders } from './openFolders'

const NEW_FOLDER = 'Nueva carpeta'

/** Lo que comparten todas las filas del árbol. */
type TreeContext = {
  tree: PagesTree
  openIds: ReadonlySet<string>
  /** La carpeta que se está renombrando en el árbol. */
  renamingId: string | null
  setRenamingId: (id: string | null) => void
  newPage: (folderId: string | null) => void
  newFolder: (parentId: string | null) => void
  askMove: (item: Movable) => void
  askDelete: (item: Movable) => void
  /** "Personalizar": color e ícono de una carpeta. */
  askStyle: (folderId: string) => void
  onNavigate?: () => void
}

type Props = {
  /** Para cerrar el panel en el celu al abrir una nota. */
  onNavigate?: () => void
}

/** La sección Notas de la sidebar: carpetas (con carpetas adentro) y notas, en un árbol. */
export function NotesSection({ onNavigate }: Props) {
  const tree = useQuery(pagesTreeQuery)
  const openIds = useOpenFolders()
  const navigate = useNavigate()
  const currentPageId = useMatch('/p/:id')?.params.id
  const createPage = useCreatePage()
  const createFolder = useCreateFolder()
  const updateFolder = useUpdateFolder()
  const updatePage = useUpdatePage()
  const deleteFolder = useDeleteFolder()
  const deletePage = useDeletePage()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [moving, setMoving] = useState<Movable | null>(null)
  const [deleting, setDeleting] = useState<Movable | null>(null)
  const [stylingId, setStylingId] = useState<string | null>(null)

  function newPage(folderId: string | null) {
    createPage.mutate(
      { folderId },
      {
        onSuccess: (page) => {
          if (folderId) setFolderOpen(folderId, true)
          void navigate(`/p/${page.id}`, { state: { focusTitle: true } })
          onNavigate?.()
        },
      },
    )
  }

  /** Se crea con un nombre y queda lista para renombrar. */
  function newFolder(parentId: string | null) {
    createFolder.mutate(
      { name: NEW_FOLDER, parentId },
      {
        onSuccess: (folder) => {
          if (parentId) setFolderOpen(parentId, true)
          setRenamingId(folder.id)
        },
      },
    )
  }

  /** Lo que se borra con una carpeta: las de adentro y sus notas. */
  function contentsOf(folderId: string) {
    const folders = tree.data?.folders ?? []
    const inner = descendantFolderIds(folders, folderId)
    const pages = (tree.data?.pages ?? []).filter(
      (page) => page.folderId === folderId || (page.folderId && inner.has(page.folderId)),
    )
    return { folders: inner.size, pages }
  }

  function askDelete(item: Movable) {
    // Una carpeta vacía se borra sin preguntar.
    if (item.kind === 'folder') {
      const contents = contentsOf(item.id)
      if (contents.folders === 0 && contents.pages.length === 0) {
        deleteFolder.mutate(item.id)
        return
      }
    }
    setDeleting(item)
  }

  function confirmDelete(item: Movable) {
    const goneIds =
      item.kind === 'page' ? [item.id] : contentsOf(item.id).pages.map((page) => page.id)
    const options = {
      onSuccess: () => {
        // Si la nota abierta se borró, a otro lado.
        if (currentPageId && goneIds.includes(currentPageId)) void navigate('/', { replace: true })
      },
    }
    if (item.kind === 'page') deletePage.mutate(item.id, options)
    else deleteFolder.mutate(item.id, options)
  }

  const context: TreeContext | null = tree.data
    ? {
        tree: tree.data,
        openIds,
        renamingId,
        setRenamingId,
        newPage,
        newFolder,
        askMove: setMoving,
        askDelete,
        askStyle: setStylingId,
        onNavigate,
      }
    : null

  return (
    <nav aria-labelledby="notes-heading" className="mt-5">
      <div className="mb-1 flex h-7 items-center justify-between gap-2 pr-1 pl-2">
        <h2 id="notes-heading" className="text-xs font-medium text-muted-foreground">
          Notas
        </h2>
        <NewMenu
          label="Nueva nota o carpeta"
          onNewPage={() => newPage(null)}
          onNewFolder={() => newFolder(null)}
        />
      </div>

      {tree.isPending ? (
        <div className="grid gap-2 px-2 pt-1" aria-label="Cargando notas">
          {[56, 40].map((width) => (
            <Skeleton key={width} className="h-5" style={{ width: `${width}%` }} />
          ))}
        </div>
      ) : tree.isError ? (
        <div className="grid gap-2 px-2 pt-1 text-[13px]">
          <p className="text-muted-foreground">No se pudieron cargar las notas.</p>
          <Button variant="outline" size="sm" onClick={() => void tree.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : context && context.tree.folders.length === 0 && context.tree.pages.length === 0 ? (
        <p className="px-2 text-[13px] leading-snug text-muted-foreground">
          Para lo que no es una tarea.{' '}
          <button
            type="button"
            onClick={() => newPage(null)}
            className="text-foreground underline-offset-2 outline-none hover:underline focus-visible:underline"
          >
            Crear una nota
          </button>
        </p>
      ) : (
        context && <TreeLevel context={context} parentId={null} depth={0} />
      )}

      <MoveDialog
        item={moving}
        folders={tree.data?.folders ?? []}
        onMove={(item, parentId) =>
          item.kind === 'folder'
            ? updateFolder.mutateAsync({ id: item.id, parentId })
            : updatePage.mutateAsync({ id: item.id, folderId: parentId })
        }
        onClose={() => setMoving(null)}
      />
      <FolderStyleDialog
        folder={tree.data?.folders.find((folder) => folder.id === stylingId) ?? null}
        onClose={() => setStylingId(null)}
      />
      <DeleteDialog
        item={deleting}
        contents={deleting?.kind === 'folder' ? contentsOf(deleting.id) : null}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </nav>
  )
}

const indent = (depth: number): CSSProperties => ({ paddingLeft: `${8 + depth * 14}px` })

const ROW_CLASS =
  'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md pr-8 outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-9'

function TreeLevel({
  context,
  parentId,
  depth,
}: {
  context: TreeContext
  parentId: string | null
  depth: number
}) {
  const folders = context.tree.folders
    .filter((folder) => folder.parentId === parentId)
    .sort((a, b) => compareNames(a.name, b.name))
  const pages = context.tree.pages
    .filter((page) => page.folderId === parentId)
    .sort((a, b) => compareTitles(a.title, b.title))

  return (
    <ul className="grid gap-px">
      {folders.map((folder) => (
        <FolderRow key={folder.id} context={context} folder={folder} depth={depth} />
      ))}
      {pages.map((page) => (
        <PageRow key={page.id} context={context} page={page} depth={depth} />
      ))}
    </ul>
  )
}

function FolderRow({
  context,
  folder,
  depth,
}: {
  context: TreeContext
  folder: Folder
  depth: number
}) {
  const update = useUpdateFolder()
  const renameInput = useRef<HTMLInputElement>(null)
  const open = context.openIds.has(folder.id)
  // Un ícono elegido queda igual abierta o cerrada (la flecha ya lo dice).
  const Icon = folder.icon ? FOLDER_ICON_OPTIONS[folder.icon].Icon : open ? FolderOpen : FolderIcon
  const item: Movable = {
    kind: 'folder',
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
  }

  return (
    <li className="min-w-0">
      <div className="group/row relative flex items-center">
        {context.renamingId === folder.id ? (
          <RenameFolder
            inputRef={renameInput}
            name={folder.name}
            style={indent(depth)}
            onDone={(name) => {
              context.setRenamingId(null)
              if (name !== null && name !== folder.name) update.mutate({ id: folder.id, name })
            }}
          />
        ) : (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setFolderOpen(folder.id, !open)}
            style={indent(depth)}
            className={ROW_CLASS}
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                '-ml-1 size-3.5 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-90',
              )}
            />
            <FolderGlyph Icon={Icon} color={folder.color} className="-ml-1 size-3.5" />
            <span className="truncate">{folder.name}</span>
          </button>
        )}
        <RowMenu
          label={`Opciones de la carpeta ${folder.name}`}
          // "Renombrar": el campo aparece con el menú abierto (que retiene el foco), así que se
          // enfoca recién cuando el menú se cierra, en vez de volver al botón "…".
          onCloseAutoFocus={(event) => {
            if (context.renamingId !== folder.id) return
            event.preventDefault()
            renameInput.current?.focus()
          }}
        >
          <DropdownMenuItem onSelect={() => context.newPage(folder.id)}>
            <FilePlus />
            Nueva nota adentro
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => context.newFolder(folder.id)}>
            <FolderPlus />
            Nueva carpeta adentro
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => context.setRenamingId(folder.id)}>
            <Pencil />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => context.askStyle(folder.id)}>
            <Palette />
            Personalizar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => context.askMove(item)}>
            <FolderInput />
            Mover a…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => context.askDelete(item)}>
            <Trash2 />
            Borrar
          </DropdownMenuItem>
        </RowMenu>
      </div>
      {open && <TreeLevel context={context} parentId={folder.id} depth={depth + 1} />}
    </li>
  )
}

function PageRow({
  context,
  page,
  depth,
}: {
  context: TreeContext
  page: PageSummary
  depth: number
}) {
  const navigate = useNavigate()
  const title = page.title || 'Sin título'
  const item: Movable = { kind: 'page', id: page.id, name: title, parentId: page.folderId }

  return (
    <li className="min-w-0">
      <div className="group/row relative flex items-center">
        <NavLink
          to={`/p/${page.id}`}
          onClick={context.onNavigate}
          style={indent(depth)}
          className={({ isActive }) =>
            cn(
              ROW_CLASS,
              isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
            )
          }
        >
          <FileText aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn('truncate', !page.title && 'text-muted-foreground')}>{title}</span>
        </NavLink>
        <RowMenu label={`Opciones de la nota ${title}`}>
          {/* El título de una nota se cambia en la nota misma: se abre con el título elegido. */}
          <DropdownMenuItem
            onSelect={() => {
              void navigate(`/p/${page.id}`, { state: { focusTitle: true } })
              context.onNavigate?.()
            }}
          >
            <Pencil />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => context.askMove(item)}>
            <FolderInput />
            Mover a…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => context.askDelete(item)}>
            <Trash2 />
            Borrar
          </DropdownMenuItem>
        </RowMenu>
      </div>
    </li>
  )
}

function RowMenu({
  label,
  children,
  onCloseAutoFocus,
}: {
  label: string
  children: ReactNode
  onCloseAutoFocus?: (event: Event) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          className="absolute right-1 text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onCloseAutoFocus={onCloseAutoFocus}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NewMenu({
  label,
  onNewPage,
  onNewFolder,
}: {
  label: string
  onNewPage: () => void
  onNewFolder: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={label} className="text-muted-foreground">
          <Plus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={onNewPage}>
          <FilePlus />
          Nueva nota
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewFolder}>
          <FolderPlus />
          Nueva carpeta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Enter o salir del campo guarda; Escape deja el nombre como estaba. */
function RenameFolder({
  inputRef,
  name,
  style,
  onDone,
}: {
  inputRef: Ref<HTMLInputElement>
  name: string
  style: CSSProperties
  onDone: (name: string | null) => void
}) {
  const [value, setValue] = useState(name)

  function save() {
    const parsed = folderNameSchema.safeParse(value)
    onDone(parsed.success ? parsed.data : null)
  }

  return (
    <div style={style} className="flex h-8 min-w-0 flex-1 items-center pr-1">
      <input
        ref={inputRef}
        autoFocus
        value={value}
        maxLength={LIMITS.folderName}
        aria-label="Nombre de la carpeta"
        onChange={(event) => setValue(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save()
          if (event.key === 'Escape') onDone(null)
        }}
        className="h-7 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  )
}

function DeleteDialog({
  item,
  contents,
  onConfirm,
  onClose,
}: {
  item: Movable | null
  contents: { folders: number; pages: PageSummary[] } | null
  onConfirm: (item: Movable) => void
  onClose: () => void
}) {
  const what = item?.kind === 'folder' ? 'la carpeta' : 'la nota'
  const inside = contents
    ? [
        contents.folders > 0 &&
          `${contents.folders} ${contents.folders === 1 ? 'carpeta' : 'carpetas'}`,
        contents.pages.length > 0 &&
          `${contents.pages.length} ${contents.pages.length === 1 ? 'nota' : 'notas'}`,
      ]
        .filter(Boolean)
        .join(' y ')
    : ''

  return (
    <AlertDialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Borrar {what} «{item?.name}»?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {inside
              ? `Se borra para siempre, con lo que tiene adentro: ${inside}.`
              : 'Se borra para siempre.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => item && onConfirm(item)}>
            Borrar {what}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
