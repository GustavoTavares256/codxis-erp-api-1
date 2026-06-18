import type { FastifyReply, FastifyRequest } from 'fastify'

import { getSearchFromQuery } from '../../../shared/http/search-query'
import { listCustomersService } from '../services/list-customers.service'

export async function listCustomersController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as {
    companyId: string
  }

  const customers = await listCustomersService(user.companyId, {
    search: getSearchFromQuery(request.query),
  })

  return reply.status(200).send(customers)
}
