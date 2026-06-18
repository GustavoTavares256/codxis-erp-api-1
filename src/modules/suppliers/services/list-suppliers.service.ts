import type { Prisma } from '@prisma/client'

import { prisma } from '../../../shared/database/prisma'

type ListSuppliersFilters = {
  search?: string
}

export async function listSuppliersService(
  companyId: string,
  filters: ListSuppliersFilters = {},
) {
  const search = filters.search?.trim()
  const searchWhere: Prisma.SupplierWhereInput | undefined = search
    ? {
        OR: [
          { name: { contains: search } },
          { document: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    : undefined

  return prisma.supplier.findMany({
    where: {
      companyId,
      ...searchWhere,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}
