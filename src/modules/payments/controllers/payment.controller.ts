import type { FastifyReply, FastifyRequest } from 'fastify'
import { createReceivableSchema, receivePaymentSchema, updateInstallmentSchema } from '../schemas/payment.schema'
import { createReceivableService, deleteReceiptService, deleteReceivableService, listReceivablesService, paymentSummaryService, receivePaymentService, updateInstallmentService } from '../services/payment.service'
type Params={id:string}
const auth=(req:FastifyRequest)=>req.user as {companyId:string;sub:string}
export async function listPaymentsController(req:FastifyRequest){return listReceivablesService(auth(req).companyId)}
export async function paymentSummaryController(req:FastifyRequest){return paymentSummaryService(auth(req).companyId)}
export async function createPaymentController(req:FastifyRequest,reply:FastifyReply){return reply.status(201).send(await createReceivableService(auth(req).companyId,createReceivableSchema.parse(req.body)))}
export async function updateInstallmentController(req:FastifyRequest<{Params:Params}>){return updateInstallmentService(auth(req).companyId,req.params.id,updateInstallmentSchema.parse(req.body))}
export async function deletePaymentController(req:FastifyRequest<{Params:Params}>,reply:FastifyReply){await deleteReceivableService(auth(req).companyId,req.params.id);return reply.status(204).send()}
export async function receivePaymentController(req:FastifyRequest<{Params:Params}>,reply:FastifyReply){const user=auth(req);return reply.status(201).send(await receivePaymentService(user.companyId,user.sub,req.params.id,receivePaymentSchema.parse(req.body)))}
export async function deleteReceiptController(req:FastifyRequest<{Params:Params}>,reply:FastifyReply){await deleteReceiptService(auth(req).companyId,req.params.id);return reply.status(204).send()}
