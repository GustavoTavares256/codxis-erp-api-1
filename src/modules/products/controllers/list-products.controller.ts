import type { FastifyReply, FastifyRequest } from 'fastify'

import { getSearchFromQuery } from '../../../shared/http/search-query'
import { listProductsService } from '../services/list-products.service'

export async function listProductsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as {
    companyId: string
  }

  const products = await listProductsService(user.companyId, {
    search: getSearchFromQuery(request.query),
  })

  return reply.status(200).send(products)
}
