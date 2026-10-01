import { createColumnSchema, idParamsSchema, updateColumnSchema } from '@notnot/shared'
import { Router } from 'express'
import { createColumn, deleteColumn, updateColumn } from '../services/columns'

export const columnsRouter = Router()

columnsRouter.post('/boards/:id/columns', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = createColumnSchema.parse(req.body)
  res.status(201).json(await createColumn(id, input))
})

columnsRouter.patch('/columns/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updateColumnSchema.parse(req.body)
  res.json(await updateColumn(id, input))
})

columnsRouter.delete('/columns/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deleteColumn(id)
  res.status(204).end()
})
