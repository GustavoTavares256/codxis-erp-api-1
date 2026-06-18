import type { Prisma } from '@prisma/client'

import { AppError } from '../../../shared/errors/app-error'
import { prisma } from '../../../shared/database/prisma'
import type { CreateProductInput } from '../schemas/product.schema'
import { buildProductPayload } from './product-payload.utils'

export async function createProductService(
  companyId: string,
  data: CreateProductInput,
) {
  if (!companyId) {
    throw new AppError('Selecione uma empresa antes de cadastrar produtos', 403)
  }

  const payload = await buildProductPayload(data, {
    companyId,
    fallbackCategory: true,
  })
  const product = await prisma.product.create({
    data: {
      ...(payload as Prisma.ProductUncheckedCreateInput),
      name: data.name,
      salePrice: payload.salePrice ?? data.salePrice,
      costPrice: payload.costPrice ?? data.costPrice ?? data.purchasePrice ?? 0,
      companyId,
    },
    include: {
      category: true,
      supplier: true,
    },
  })

  return product
}
