import { prisma } from '../../../shared/database/prisma'
import { AppError } from '../../../shared/errors/app-error'

export async function getSupplierByIdService(
  companyId: string,
  supplierId: string,
) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      companyId,
    },
  })

  if (!supplier) {
    throw new AppError('Fornecedor nao encontrado', 404)
  }

  return supplier
}
