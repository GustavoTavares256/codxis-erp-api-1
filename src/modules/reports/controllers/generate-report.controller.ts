import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import {
  generateReportService,
  type ReportType,
} from '../services/generate-report.service'

const paramsSchema = z.object({
  type: z.enum(['stock', 'sales', 'financial', 'customers', 'payments']),
})

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD')
  .refine(isValidDate, 'Data invalida')

const querySchema = z
  .object({
    date: dateSchema.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELED']).optional(),
  })
  .superRefine((query, context) => {
    if (query.date) return

    if ((query.startDate && !query.endDate) || (!query.startDate && query.endDate)) {
      context.addIssue({
        code: 'custom',
        message: 'Informe startDate e endDate juntos',
        path: query.startDate ? ['endDate'] : ['startDate'],
      })
    }
  })

export async function generateReportController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as {
    companyId: string
  }
  const { type } = paramsSchema.parse(request.params)
  const filters = querySchema.parse(request.query)
  const report = await generateReportService(
    user.companyId,
    type as ReportType,
    filters,
  )

  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${report.filename}"`)
    .send(report.buffer)
}

function isValidDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}
