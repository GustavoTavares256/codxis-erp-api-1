import { prisma } from '../../../shared/database/prisma'
import type { CreateSaleInput } from '../schemas/sale.schema'
import { buildInstallments } from '../../payments/services/installment-calculator'

export async function createSaleService(
  companyId: string,
  userId: string,
  data: CreateSaleInput,
) {
  if (data.paymentCondition === 'INSTALLMENT' && !data.customerId) {
    throw new Error('Selecione um cliente para vendas a prazo')
  }
  if (data.paymentCondition === 'INSTALLMENT' && !data.firstDueDate) {
    throw new Error('Informe o primeiro vencimento')
  }
  const products = await prisma.product.findMany({
    where: {
      companyId,
      id: {
        in: data.items.map((item) => item.productId),
      },
    },
  })

  if (products.length !== data.items.length) {
    throw new Error('Um ou mais produtos não foram encontrados')
  }

  let totalAmount = 0

  for (const item of data.items) {
    const product = products.find((p) => p.id === item.productId)

    if (!product) {
      throw new Error('Produto não encontrado')
    }

    if (product.stock < item.quantity) {
      throw new Error(`Estoque insuficiente para ${product.name}`)
    }

    const unitPrice = item.unitPrice ?? Number(product.salePrice)
    const discount = item.discount ?? 0

    totalAmount += Math.max(unitPrice * item.quantity - discount, 0)
  }

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        companyId,
        userId,
        customerId: data.customerId,
        paymentMethod: data.paymentMethod,
        paymentCondition: data.paymentCondition,
        totalAmount,
        items: {
          create: data.items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!

            return {
              productId: item.productId,
              productName: item.productName || product.name,
              quantity: item.quantity,
              unit: item.unit || product.unit || 'UN',
              unitPrice: item.unitPrice ?? product.salePrice,
              discount: item.discount ?? 0,
              subtotal: Math.max(
                Number(item.unitPrice ?? product.salePrice) * item.quantity -
                  Number(item.discount ?? 0),
                0,
              ),
            }
          }),
        },
      },
      include: {
        items: true,
      },
    })

    for (const item of data.items) {
      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      })

      await tx.stockMovement.create({
        data: {
          type: 'OUT',
          quantity: item.quantity,
          reason: 'Venda realizada',
          productId: item.productId,
          companyId,
        },
      })
    }

    if (data.paymentCondition === 'INSTALLMENT') {
      const firstDueDate = new Date(data.firstDueDate!)
      const installments = buildInstallments(totalAmount, data.installmentsCount, firstDueDate)
      await tx.receivable.create({ data: {
        companyId, customerId: data.customerId, saleId: createdSale.id,
        description: `Venda #${createdSale.id.slice(0, 8)}`, totalAmount,
        installments: { create: installments },
      } })
    } else {
      await tx.financialTransaction.create({ data: {
        companyId, saleId: createdSale.id, description: `Venda #${createdSale.id.slice(0, 8)}`,
        amount: totalAmount, type: 'INCOME', status: 'PAID', paidAt: new Date(),
      } })
    }

    return createdSale
  })

  return sale
}
