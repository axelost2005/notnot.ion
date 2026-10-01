type FolderLike = { id: string; parentId: string | null }

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

/** Orden alfabético en castellano: sin mayúsculas ni acentos, y "Nota 2" antes que "Nota 10". */
export const compareNames = (a: string, b: string) => collator.compare(a, b)

/** Las notas sin título van al final. */
export function compareTitles(a: string, b: string) {
  if (!a || !b) return Number(!a) - Number(!b)
  return compareNames(a, b)
}

/** Las carpetas que hay adentro de `folderId`, a cualquier profundidad (sin contarla a ella). */
export function descendantFolderIds(folders: readonly FolderLike[], folderId: string): Set<string> {
  const children = new Map<string, string[]>()
  for (const folder of folders) {
    if (folder.parentId === null) continue
    children.set(folder.parentId, [...(children.get(folder.parentId) ?? []), folder.id])
  }
  const found = new Set<string>()
  const pending = [folderId]
  while (pending.length > 0) {
    for (const child of children.get(pending.pop()!) ?? []) {
      if (found.has(child)) continue
      found.add(child)
      pending.push(child)
    }
  }
  return found
}

/** Mover una carpeta adentro de sí misma (o de una de las suyas) la dejaría colgando. */
export function canMoveFolder(
  folders: readonly FolderLike[],
  folderId: string,
  parentId: string | null,
): boolean {
  if (parentId === null) return true
  return parentId !== folderId && !descendantFolderIds(folders, folderId).has(parentId)
}

/** Las carpetas desde la raíz hasta `folderId` (incluida). */
export function folderPath<T extends FolderLike>(
  folders: readonly T[],
  folderId: string | null,
): T[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const path: T[] = []
  let current = folderId === null ? undefined : byId.get(folderId)
  while (current && !path.includes(current)) {
    path.unshift(current)
    current = current.parentId === null ? undefined : byId.get(current.parentId)
  }
  return path
}
