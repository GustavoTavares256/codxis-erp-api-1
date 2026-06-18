import type { Prisma } from '@prisma/client'

import { prisma } from '../../../shared/database/prisma'

type ListCustomersFilters = {
  search?: string
}

export async function listCustomersService(
  companyId: string,
  filters: ListCustomersFilters = {},
) {
  const search = filters.search?.trim()
  const searchWhere: Prisma.CustomerWhereInput | undefined = search
    ? {
        OR: [
          { name: { contains: search } },
          { document: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    : undefined

  return prisma.customer.findMany({
    where: {
      companyId,
      ...searchWhere,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}
