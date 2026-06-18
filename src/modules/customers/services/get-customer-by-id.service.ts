import { prisma } from '../../../shared/database/prisma'
import { AppError } from '../../../shared/errors/app-error'

export async function getCustomerByIdService(
  companyId: string,
  customerId: string,
) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId,
    },
  })

  if (!customer) {
    throw new AppError('Cliente nao encontrado', 404)
  }

  return customer
}
