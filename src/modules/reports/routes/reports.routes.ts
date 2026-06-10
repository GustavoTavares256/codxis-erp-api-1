import type { FastifyInstance } from 'fastify'

import { ensureAuthenticated } from '../../../shared/middlewares/ensure-authenticated'
import { ensureCompanyActive } from '../../../shared/middlewares/ensure-company-active'
import { generateReportController } from '../controllers/generate-report.controller'

export async function reportsRoutes(app: FastifyInstance) {
  app.get(
    '/:type/pdf',
    {
      preHandler: [
        ensureAuthenticated,
        ensureCompanyActive,
      ],
    },
    generateReportController,
  )
}
