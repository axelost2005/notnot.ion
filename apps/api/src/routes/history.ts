import { historyQuerySchema } from '@notnot/shared'
import { Router } from 'express'
import { archiveBeforeToday } from '../middleware/archive'
import { listHistory } from '../services/history'

export const historyRouter = Router()

historyRouter.get('/history', archiveBeforeToday, async (req, res) => {
  const { boardId, before } = historyQuerySchema.parse(req.query)
  res.json(await listHistory(boardId, before))
})
