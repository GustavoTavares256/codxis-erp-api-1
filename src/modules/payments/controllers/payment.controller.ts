import type { FastifyReply, FastifyRequest } from 'fastify'

import {
  createReceivableSchema,
  receivePaymentSchema,
  updateInstallmentSchema,
  updateReceivableSchema,
} from '../schemas/payment.schema'
import {
  createReceivableService,
  deleteReceiptService,
  deleteReceivableService,
  listReceivablesService,
  paymentSummaryService,
  receivePaymentService,
  updateInstallmentService,
  updateReceivableService,
} from '../services/payment.service'

type IdParams = { id: string }
const auth = (request: FastifyRequest) => request.user as { companyId: string; sub: string }

export async function listPaymentsController(request: FastifyRequest) {
  return listReceivablesService(auth(request).companyId)
}

export async function paymentSummaryController(request: FastifyRequest) {
  return paymentSummaryService(auth(request).companyId)
}

export async function createPaymentController(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(201).send(
    await createReceivableService(auth(request).companyId, createReceivableSchema.parse(request.body)),
  )
}

export async function updatePaymentController(request: FastifyRequest<{ Params: IdParams }>) {
  return updateReceivableService(
    auth(request).companyId,
    request.params.id,
    updateReceivableSchema.parse(request.body),
  )
}

export async function updateInstallmentController(request: FastifyRequest<{ Params: IdParams }>) {
  return updateInstallmentService(
    auth(request).companyId,
    request.params.id,
    updateInstallmentSchema.parse(request.body),
  )
}

export async function deletePaymentController(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  await deleteReceivableService(auth(request).companyId, request.params.id)
  return reply.status(204).send()
}

export async function receivePaymentController(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const user = auth(request)
  return reply.status(201).send(
    await receivePaymentService(user.companyId, user.sub, request.params.id, receivePaymentSchema.parse(request.body)),
  )
}

export async function deleteReceiptController(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  await deleteReceiptService(auth(request).companyId, request.params.id)
  return reply.status(204).send()
}
