import { createBoardSchema, idParamsSchema, updateBoardSchema } from '@notnot/shared'
import { Router } from 'express'
import { archiveBeforeToday } from '../middleware/archive'
import { createBoard, deleteBoard, getBoard, listBoards, updateBoard } from '../services/boards'

export const boardsRouter = Router()

boardsRouter.get('/boards', async (_req, res) => {
  res.json(await listBoards())
})

boardsRouter.post('/boards', async (req, res) => {
  const input = createBoardSchema.parse(req.body)
  res.status(201).json(await createBoard(input))
})

boardsRouter.get('/boards/:id', archiveBeforeToday, async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  res.json(await getBoard(id))
})

boardsRouter.patch('/boards/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updateBoardSchema.parse(req.body)
  res.json(await updateBoard(id, input))
})

boardsRouter.delete('/boards/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deleteBoard(id)
  res.status(204).end()
})
