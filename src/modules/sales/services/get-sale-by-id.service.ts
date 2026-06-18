import { prisma } from '../../../shared/database/prisma'
import { AppError } from '../../../shared/errors/app-error'

export async function getSaleByIdService(
  companyId: string,
  saleId: string,
) {
  const sale = await prisma.sale.findFirst({
    where: {
      id: saleId,
      companyId,
    },
    include: {
      customer: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  })

  if (!sale) {
    throw new AppError('Venda nao encontrada', 404)
  }

  return sale
}
