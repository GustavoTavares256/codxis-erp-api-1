import type { FastifyInstance } from 'fastify'

import { ensureAuthenticated } from '../../../shared/middlewares/ensure-authenticated'
import { ensureCompanyActive } from '../../../shared/middlewares/ensure-company-active'

import { createSaleController } from '../controllers/create-sale.controller'
import { listSalesController } from '../controllers/list-sales.controller'
import { getSaleByIdController } from '../controllers/get-sale-by-id.controller'
import { cancelSaleController } from '../controllers/cancel-sale.controller'
import { updateSaleController } from '../controllers/update-sale.controller'

export async function salesRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      preHandler: [
        ensureAuthenticated,
        ensureCompanyActive,
      ],
    },
    createSaleController,
  )

  app.get(
    '/',
    {
      preHandler: [
        ensureAuthenticated,
        ensureCompanyActive,
      ],
    },
    listSalesController,
  )
  app.put(
    '/:id',
    { preHandler: [ensureAuthenticated, ensureCompanyActive] },
    updateSaleController,
  )

  app.get(
    '/:id',
    {
      preHandler: [
        ensureAuthenticated,
        ensureCompanyActive,
      ],
    },
    getSaleByIdController,
  )
  app.patch(
  '/:id/cancel',
  {
    preHandler: [
      ensureAuthenticated,
      ensureCompanyActive,
    ],
  },
  cancelSaleController,
)
}
