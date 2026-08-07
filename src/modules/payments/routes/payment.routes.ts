import type { FastifyInstance } from 'fastify'

import { ensureAuthenticated } from '../../../shared/middlewares/ensure-authenticated'
import { ensureCompanyActive } from '../../../shared/middlewares/ensure-company-active'
import {
  createPaymentController,
  deletePaymentController,
  deleteReceiptController,
  listPaymentsController,
  paymentSummaryController,
  receivePaymentController,
  updateInstallmentController,
  updatePaymentController,
} from '../controllers/payment.controller'

export async function registerPaymentsModule(app: FastifyInstance) {
  await app.register(async (router) => {
    router.addHook('preHandler', ensureAuthenticated)
    router.addHook('preHandler', ensureCompanyActive)
    router.get('/', listPaymentsController)
    router.get('/summary', paymentSummaryController)
    router.post('/', createPaymentController)
    router.put('/:id', updatePaymentController)
    router.delete('/:id', deletePaymentController)
    router.put('/installments/:id', updateInstallmentController)
    router.post('/installments/:id/receipts', receivePaymentController)
    router.delete('/receipts/:id', deleteReceiptController)
    router.post('/:paymentId/installments/:id/receipts', receivePaymentController)
    router.delete('/:paymentId/installments/:installmentId/receipts/:id', deleteReceiptController)
  }, { prefix: '/payments' })
}
