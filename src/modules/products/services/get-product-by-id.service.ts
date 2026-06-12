import { prisma } from '../../../shared/database/prisma'

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
    throw new Error('Produto não encontrado')
  }

  return product
}
