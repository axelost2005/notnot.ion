import type {
  CreateFolderInput,
  CreatePageInput,
  Folder,
  Page,
  PageSummary,
  PagesTree,
  UpdateFolderInput,
  UpdatePageInput,
} from '@notnot/shared'
import { canMoveFolder } from '@notnot/shared'
import { prisma } from '../db'
import type * as Db from '../generated/prisma/client'
import { conflict, notFound } from '../middleware/errors'

// La sección Notas: carpetas (con carpetas adentro) y notas con título y texto. En el código
// son `Folder` y `Page`; `Note` son las notas de los tableros.

function toFolder(folder: Db.Folder): Folder {
  return {
    id: folder.id,
    parentId: folder.parentId,
    name: folder.name,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  }
}

function toPageSummary(page: Pick<Db.Page, 'id' | 'folderId' | 'title' | 'updatedAt'>) {
  return {
    id: page.id,
    folderId: page.folderId,
    title: page.title,
    updatedAt: page.updatedAt.toISOString(),
  } satisfies PageSummary
}

function toPage(page: Db.Page): Page {
  return { ...toPageSummary(page), content: page.content, createdAt: page.createdAt.toISOString() }
}

/** Todo el árbol: es chico y la sidebar lo muestra entero. El texto de las notas no viaja. */
export async function getPagesTree(): Promise<PagesTree> {
  const [folders, pages] = await Promise.all([
    prisma.folder.findMany(),
    prisma.page.findMany({ select: { id: true, folderId: true, title: true, updatedAt: true } }),
  ])
  return { folders: folders.map(toFolder), pages: pages.map(toPageSummary) }
}

async function assertFolder(id: string | null | undefined) {
  if (!id) return
  const folder = await prisma.folder.findUnique({ where: { id }, select: { id: true } })
  if (!folder) throw notFound('La carpeta no existe')
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  await assertFolder(input.parentId)
  const folder = await prisma.folder.create({
    data: { name: input.name, parentId: input.parentId ?? null },
  })
  return toFolder(folder)
}

export async function updateFolder(id: string, input: UpdateFolderInput): Promise<Folder> {
  if (input.parentId !== undefined) {
    await assertFolder(input.parentId)
    const folders = await prisma.folder.findMany({ select: { id: true, parentId: true } })
    if (!folders.some((folder) => folder.id === id)) throw notFound('La carpeta no existe')
    if (!canMoveFolder(folders, id, input.parentId)) {
      throw conflict('Una carpeta no puede ir dentro de sí misma')
    }
  }
  const folder = await prisma.folder.update({
    where: { id },
    data: { name: input.name, parentId: input.parentId },
  })
  return toFolder(folder)
}

/** Se lleva todo lo de adentro (carpetas y notas), en cascada. */
export async function deleteFolder(id: string): Promise<void> {
  await prisma.folder.delete({ where: { id } })
}

export async function getPage(id: string): Promise<Page> {
  const page = await prisma.page.findUnique({ where: { id } })
  if (!page) throw notFound('La nota no existe')
  return toPage(page)
}

export async function createPage(input: CreatePageInput): Promise<Page> {
  await assertFolder(input.folderId)
  const page = await prisma.page.create({
    data: { title: input.title ?? '', folderId: input.folderId ?? null },
  })
  return toPage(page)
}

export async function updatePage(id: string, input: UpdatePageInput): Promise<Page> {
  await assertFolder(input.folderId)
  const page = await prisma.page.update({
    where: { id },
    data: { title: input.title, content: input.content, folderId: input.folderId },
  })
  return toPage(page)
}

export async function deletePage(id: string): Promise<void> {
  await prisma.page.delete({ where: { id } })
}
