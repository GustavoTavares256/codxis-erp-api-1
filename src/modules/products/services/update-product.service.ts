import { prisma } from '../../../shared/database/prisma'
import type { UpdateProductInput } from '../schemas/product.schema'
import { buildProductPayload } from './product-payload.utils'

export async function updateProductService(
  companyId: string,
  productId: string,
  data: UpdateProductInput,
) {
  const productExists = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId,
    },
  })

  if (!productExists) {
    throw new Error('Produto não encontrado')
  }

  const payload = await buildProductPayload(data, {
    companyId,
  })

  const product = await prisma.product.update({
    where: {
      id: productId,
    },
    data: payload,
    include: {
      category: true,
      supplier: true,
    },
  })

  return product
}
