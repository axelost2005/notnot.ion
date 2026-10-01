import { createPageSchema, idParamsSchema, updatePageSchema } from '@notnot/shared'
import { Router } from 'express'
import { createPage, deletePage, getPage, updatePage } from '../services/pages'

export const pagesRouter = Router()

pagesRouter.get('/pages/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  res.json(await getPage(id))
})

pagesRouter.post('/pages', async (req, res) => {
  const input = createPageSchema.parse(req.body)
  res.status(201).json(await createPage(input))
})

pagesRouter.patch('/pages/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updatePageSchema.parse(req.body)
  res.json(await updatePage(id, input))
})

pagesRouter.delete('/pages/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deletePage(id)
  res.status(204).end()
})
