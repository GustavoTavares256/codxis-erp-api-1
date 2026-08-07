import { prisma } from '../../../shared/database/prisma'

export async function listSalesService(companyId: string) {
  const sales = await prisma.sale.findMany({
    where: {
      companyId,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },
        },
      },
      receivable: {
        include: { installments: { orderBy: { number: 'asc' } } },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return sales.map((sale) => ({
    ...sale,
    paymentTerm: sale.paymentCondition === 'INSTALLMENT' ? 'INSTALLMENTS' : 'CASH',
    installmentCount: sale.receivable?.installments.length ?? 1,
    firstDueDate: sale.receivable?.installments[0]?.dueDate,
  }))
}
