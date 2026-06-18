import type { FastifyReply, FastifyRequest } from 'fastify'

import { getSearchFromQuery } from '../../../shared/http/search-query'
import { listCategoriesService } from '../services/list-categories.service'

export async function listCategoriesController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as {
    companyId: string
  }

  const categories = await listCategoriesService(user.companyId, {
    search: getSearchFromQuery(request.query),
  })

  return reply.status(200).send(categories)
}
