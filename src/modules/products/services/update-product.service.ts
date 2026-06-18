import { prisma } from '../../../shared/database/prisma'
import { AppError } from '../../../shared/errors/app-error'
import type { UpdateProductInput } from '../schemas/product.schema'
import { buildProductPayload } from './product-payload.utils'

export async function updateProductService(
  companyId: string,
  productId: string,
  data: UpdateProductInput,
) {
  if (!companyId) {
    throw new AppError('Selecione uma empresa antes de atualizar produtos', 403)
  }

  const productExists = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId,
    },
  })

  if (!productExists) {
    throw new AppError('Produto nao encontrado', 404)
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
