import { prisma } from '../../../shared/database/prisma'
import type { StockMovementInput } from '../schemas/stock.schema'

export async function stockInService(
  companyId: string,
  data: StockMovementInput,
) {
  const product = await prisma.product.findFirst({
    where: {
      id: data.productId,
      companyId,
    },
  })

  if (!product) {
    throw new Error('Produto não encontrado')
  }

  const updatedProduct = await prisma.product.update({
    where: {
      id: product.id,
    },
    data: {
      stock: {
        increment: data.quantity,
      },
    },
  })

  await prisma.stockMovement.create({
    data: {
      type: 'IN',
      quantity: data.quantity,
      reason: data.reason,
      productId: product.id,
      companyId,
    },
  })

  return updatedProduct
}
