import {
  createDayItemsSchema,
  DAY_START_HEADER,
  idParamsSchema,
  updateDayItemSchema,
} from '@notnot/shared'
import { Router } from 'express'
import { parseDayStart } from '../middleware/archive'
import { createDayItems, deleteDayItem, listDayItems, updateDayItem } from '../services/dayItems'

export const dayItemsRouter = Router()

dayItemsRouter.get('/day-items', async (req, res) => {
  res.json(await listDayItems(parseDayStart(req.get(DAY_START_HEADER))))
})

dayItemsRouter.post('/day-items', async (req, res) => {
  const input = createDayItemsSchema.parse(req.body)
  res.status(201).json(await createDayItems(input))
})

dayItemsRouter.patch('/day-items/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updateDayItemSchema.parse(req.body)
  res.json(await updateDayItem(id, input))
})

dayItemsRouter.delete('/day-items/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deleteDayItem(id)
  res.status(204).end()
})
