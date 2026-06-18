import { prisma } from '../../../shared/database/prisma'
import { AppError } from '../../../shared/errors/app-error'

export async function getCategoryByIdService(
  companyId: string,
  categoryId: string,
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      companyId,
    },
  })

  if (!category) {
    throw new AppError('Categoria nao encontrada', 404)
  }

  return category
}
