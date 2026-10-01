import { createFolderSchema, idParamsSchema, updateFolderSchema } from '@notnot/shared'
import { Router } from 'express'
import { createFolder, deleteFolder, getPagesTree, updateFolder } from '../services/pages'

export const foldersRouter = Router()

/** El árbol de la sección Notas: las carpetas y las notas (sin su texto). */
foldersRouter.get('/folders', async (_req, res) => {
  res.json(await getPagesTree())
})

foldersRouter.post('/folders', async (req, res) => {
  const input = createFolderSchema.parse(req.body)
  res.status(201).json(await createFolder(input))
})

foldersRouter.patch('/folders/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updateFolderSchema.parse(req.body)
  res.json(await updateFolder(id, input))
})

foldersRouter.delete('/folders/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deleteFolder(id)
  res.status(204).end()
})
