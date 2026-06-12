import { prisma } from '../../../shared/database/prisma'

export async function cancelSaleService(
  companyId: string,
  saleId: string,
) {
  const sale = await prisma.sale.findFirst({
    where: {
      id: saleId,
      companyId,
    },
    include: {
      items: true,
    },
  })

  if (!sale) {
    throw new Error('Venda não encontrada')
  }

  if (sale.status === 'CANCELED') {
    throw new Error('Venda já está cancelada')
  }

  const canceledSale = await prisma.$transaction(async (tx) => {
    const updatedSale = await tx.sale.update({
      where: {
        id: sale.id,
      },
      data: {
        status: 'CANCELED',
      },
      include: {
        items: true,
      },
    })

    for (const item of sale.items) {
      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      })

      await tx.stockMovement.create({
        data: {
          type: 'IN',
          quantity: item.quantity,
          reason: 'Cancelamento de venda',
          productId: item.productId,
          companyId,
        },
      })
    }

    return updatedSale
  })

  return canceledSale
}
