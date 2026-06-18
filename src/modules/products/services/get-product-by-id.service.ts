import { prisma } from '../../../shared/database/prisma'
import { AppError } from '../../../shared/errors/app-error'

export async function getProductByIdService(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId,
    },
    include: {
      category: true,
      supplier: true,
    },
  })

  if (!product) {
    throw new AppError('Produto nao encontrado', 404)
  }

  return product
}
