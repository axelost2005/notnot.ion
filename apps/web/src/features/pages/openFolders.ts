import { useSyncExternalStore } from 'react'
import { readStorage, writeStorage } from '@/lib/storage'

// Qué carpetas del árbol de Notas están abiertas. Se recuerda en este dispositivo y lo comparten
// la sidebar de la compu y la del celu.

const KEY = 'notnot:carpetas-abiertas'

function read(): ReadonlySet<string> {
  try {
    const value: unknown = JSON.parse(readStorage(KEY) ?? '[]')
    return new Set(Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

let open = read()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function update(change: (next: Set<string>) => void) {
  const next = new Set(open)
  change(next)
  open = next
  writeStorage(KEY, JSON.stringify([...open]))
  for (const listener of listeners) listener()
}

export const useOpenFolders = () => useSyncExternalStore(subscribe, () => open)

export function setFolderOpen(id: string, value: boolean) {
  update((next) => (value ? next.add(id) : next.delete(id)))
}

/** Abre varias de una (por ejemplo, las que llevan a la nota abierta). */
export function openFolders(ids: readonly string[]) {
  if (ids.every((id) => open.has(id))) return
  update((next) => ids.forEach((id) => next.add(id)))
}
