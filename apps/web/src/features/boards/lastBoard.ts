import { readStorage, writeStorage } from '@/lib/storage'

const KEY = 'notnot:last-board'

export const readLastBoard = () => readStorage(KEY)
export const writeLastBoard = (slug: string) => writeStorage(KEY, slug)
