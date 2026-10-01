import { createNoteSchema, idParamsSchema, notesQuerySchema } from '@notnot/shared'
import { Router } from 'express'
import { createNote, deleteNote, listNotes } from '../services/notes'

export const notesRouter = Router()

notesRouter.get('/boards/:id/notes', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const { before } = notesQuerySchema.parse(req.query)
  res.json(await listNotes(id, before))
})

notesRouter.post('/notes', async (req, res) => {
  const input = createNoteSchema.parse(req.body)
  res.status(201).json(await createNote(input))
})

notesRouter.delete('/notes/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deleteNote(id)
  res.status(204).end()
})
