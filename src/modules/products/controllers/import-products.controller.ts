import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../../shared/errors/app-error'
import { importProductsService } from '../services/import-products.service'

export async function importProductsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as {
    companyId: string
  }
  const file = await request.file()

  if (!file) {
    throw new AppError('Arquivo de produtos nao enviado.', 400)
  }

  const summary = await importProductsService(
    user.companyId,
    {
      filename: file.filename,
      mimetype: file.mimetype,
      buffer: await file.toBuffer(),
    },
    {
      logger: request.log,
    },
  )

  return reply.status(200).send(summary)
}
