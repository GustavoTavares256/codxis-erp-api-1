import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import {
  generateReportService,
  type ReportType,
} from '../services/generate-report.service'

const paramsSchema = z.object({
  type: z.enum(['stock', 'sales', 'financial', 'customers']),
})

export async function generateReportController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as {
    companyId: string
  }
  const { type } = paramsSchema.parse(request.params)
  const report = await generateReportService(user.companyId, type as ReportType)

  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${report.filename}"`)
    .send(report.buffer)
}
