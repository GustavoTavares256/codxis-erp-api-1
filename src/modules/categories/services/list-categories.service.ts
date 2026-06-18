import type { Prisma } from '@prisma/client'

import { prisma } from '../../../shared/database/prisma'

type ListCategoriesFilters = {
  search?: string
}

export async function listCategoriesService(
  companyId: string,
  filters: ListCategoriesFilters = {},
) {
  const search = filters.search?.trim()
  const searchWhere: Prisma.CategoryWhereInput | undefined = search
    ? {
        name: {
          contains: search,
        },
      }
    : undefined

  return prisma.category.findMany({
    where: {
      companyId,
      ...searchWhere,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}
