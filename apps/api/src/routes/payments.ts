import {
  createPaymentSchema,
  idParamsSchema,
  paymentsQuerySchema,
  updatePaymentSchema,
} from '@notnot/shared'
import { Router } from 'express'
import {
  createPayment,
  deletePayment,
  getPaymentsSummary,
  listPayments,
  updatePayment,
} from '../services/payments'

export const paymentsRouter = Router()

paymentsRouter.get('/payments', async (req, res) => {
  const { month } = paymentsQuerySchema.parse(req.query)
  res.json(await listPayments(month))
})

// Antes que `/payments/:id`: "summary" no es un id.
paymentsRouter.get('/payments/summary', async (_req, res) => {
  res.json(await getPaymentsSummary())
})

paymentsRouter.post('/payments', async (req, res) => {
  const input = createPaymentSchema.parse(req.body)
  res.status(201).json(await createPayment(input))
})

paymentsRouter.patch('/payments/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updatePaymentSchema.parse(req.body)
  res.json(await updatePayment(id, input))
})

paymentsRouter.delete('/payments/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  await deletePayment(id)
  res.status(204).end()
})
