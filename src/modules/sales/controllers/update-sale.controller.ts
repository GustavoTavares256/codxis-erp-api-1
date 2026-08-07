import type { FastifyReply, FastifyRequest } from 'fastify'

import { createSaleSchema } from '../schemas/sale.schema'
import { updateSaleService } from '../services/update-sale.service'

export async function updateSaleController(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: string }
  const params = request.params as { id: string }
  const sale = await updateSaleService(user.companyId, params.id, createSaleSchema.parse(request.body))
  return reply.status(200).send(sale)
}
