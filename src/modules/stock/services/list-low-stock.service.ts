import { prisma } from '../../../shared/database/prisma'

export async function listLowStockService(companyId: string) {
  const products = await prisma.product.findMany({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: {
      stock: 'asc',
    },
  })

  return products.filter(
    (product) => product.stock <= product.minimumStock,
  )
}
