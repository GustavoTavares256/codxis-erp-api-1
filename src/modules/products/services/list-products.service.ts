import type { Prisma } from '@prisma/client'

import { prisma } from '../../../shared/database/prisma'

type ListProductsFilters = {
  search?: string
}

export async function listProductsService(
  companyId: string,
  filters: ListProductsFilters = {},
) {
  const search = filters.search?.trim()
  const searchWhere: Prisma.ProductWhereInput | undefined = search
    ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { sku: { contains: search } },
          { barcode: { contains: search } },
          { taxableBarcode: { contains: search } },
          { brand: { contains: search } },
          { factoryReference: { contains: search } },
          {
            category: {
              is: {
                name: { contains: search },
              },
            },
          },
          {
            supplier: {
              is: {
                name: { contains: search },
              },
            },
          },
        ],
      }
    : undefined

  const products = await prisma.product.findMany({
    where: {
      companyId,
      ...searchWhere,
    },
    include: {
      category: true,
      supplier: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return products
}
