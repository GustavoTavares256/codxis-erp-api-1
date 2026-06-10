import type { FastifyInstance } from 'fastify'

import { reportsRoutes } from './reports.routes'

export function registerReportsModule(app: FastifyInstance) {
  app.register(reportsRoutes, {
    prefix: '/reports',
  })
}
