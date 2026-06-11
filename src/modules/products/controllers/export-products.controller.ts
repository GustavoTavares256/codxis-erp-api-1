import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { exportProductsService } from '../services/export-products.service'

const exportProductsQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
})

export async function exportProductsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as {
    companyId: string
  }
  const { format } = exportProductsQuerySchema.parse(request.query)
  const exported = await exportProductsService(user.companyId, format)

  return reply
    .header('Content-Type', exported.contentType)
    .header(
      'Content-Disposition',
      `attachment; filename="${exported.filename}"`,
    )
    .send(exported.buffer)
}
