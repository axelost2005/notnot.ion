import { createTaskSchema, idParamsSchema, moveTaskSchema, updateTaskSchema } from '@notnot/shared'
import { Router } from 'express'
import { createTask, deleteTask, moveTask, updateTask } from '../services/tasks'

export const tasksRouter = Router()

tasksRouter.post('/tasks', async (req, res) => {
  const input = createTaskSchema.parse(req.body)
  res.status(201).json(await createTask(input))
})

tasksRouter.patch('/tasks/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const changes = updateTaskSchema.parse(req.body)
  res.json(await updateTask(id, changes))
})

tasksRouter.delete('/tasks/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deleteTask(id)
  res.status(204).end()
})

tasksRouter.post('/tasks/:id/move', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = moveTaskSchema.parse(req.body)
  res.json(await moveTask(id, input))
})
