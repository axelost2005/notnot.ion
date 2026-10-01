import { createReceivableSchema, idParamsSchema, updateReceivableSchema } from '@notnot/shared'
import { Router } from 'express'
import {
  createReceivable,
  deleteReceivable,
  listReceivables,
  updateReceivable,
} from '../services/receivables'

export const receivablesRouter = Router()

receivablesRouter.get('/receivables', async (_req, res) => {
  res.json(await listReceivables())
})

receivablesRouter.post('/receivables', async (req, res) => {
  const input = createReceivableSchema.parse(req.body)
  res.status(201).json(await createReceivable(input))
})

receivablesRouter.patch('/receivables/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updateReceivableSchema.parse(req.body)
  res.json(await updateReceivable(id, input))
})

receivablesRouter.delete('/receivables/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deleteReceivable(id)
  res.status(204).end()
})
