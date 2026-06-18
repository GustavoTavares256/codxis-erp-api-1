import type { FastifyReply, FastifyRequest } from 'fastify'

import { getSearchFromQuery } from '../../../shared/http/search-query'
import { listSuppliersService } from '../services/list-suppliers.service'

export async function listSuppliersController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as {
    companyId: string
  }

  const suppliers = await listSuppliersService(user.companyId, {
    search: getSearchFromQuery(request.query),
  })

  return reply.status(200).send(suppliers)
}
