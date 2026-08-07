import { prisma } from '../../../shared/database/prisma'
import { AppError } from '../../../shared/errors/app-error'
import { buildInstallments } from '../../payments/services/installment-calculator'
import type { CreateSaleInput } from '../schemas/sale.schema'

export async function updateSaleService(
  companyId: string,
  saleId: string,
  data: CreateSaleInput,
) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, companyId },
    include: {
      items: true,
      receivable: { include: { installments: { include: { receipts: true } } } },
    },
  })
  if (!sale) throw new AppError('Venda não encontrada', 404)
  if (sale.status === 'CANCELED') throw new AppError('Venda cancelada não pode ser editada', 409)
  if (sale.receivable?.installments.some((item) => item.receipts.length > 0)) {
    throw new AppError('Venda com recebimentos não pode ser editada', 409)
  }
  if (data.paymentCondition === 'INSTALLMENT' && !data.customerId) {
    throw new AppError('Selecione um cliente para vendas a prazo', 400)
  }
  if (data.paymentCondition === 'INSTALLMENT' && !data.firstDueDate) {
    throw new AppError('Informe o primeiro vencimento', 400)
  }

  const products = await prisma.product.findMany({
    where: { companyId, id: { in: data.items.map((item) => item.productId) } },
  })
  if (products.length !== new Set(data.items.map((item) => item.productId)).size) {
    throw new AppError('Um ou mais produtos não foram encontrados', 404)
  }

  const previousQuantities = new Map<string, number>()
  for (const item of sale.items) {
    previousQuantities.set(item.productId, (previousQuantities.get(item.productId) ?? 0) + item.quantity)
  }
  let totalAmount = 0
  for (const item of data.items) {
    const product = products.find((candidate) => candidate.id === item.productId)!
    const available = product.stock + (previousQuantities.get(item.productId) ?? 0)
    if (available < item.quantity) throw new AppError(`Estoque insuficiente para ${product.name}`, 409)
    totalAmount += Math.max(Number(item.unitPrice ?? product.salePrice) * item.quantity - Number(item.discount ?? 0), 0)
  }

  return prisma.$transaction(async (transaction) => {
    for (const oldItem of sale.items) {
      await transaction.product.update({ where: { id: oldItem.productId }, data: { stock: { increment: oldItem.quantity } } })
      await transaction.stockMovement.create({
        data: { type: 'IN', quantity: oldItem.quantity, reason: 'Edição de venda - estorno', productId: oldItem.productId, companyId },
      })
    }
    await transaction.financialTransaction.deleteMany({ where: { saleId } })
    if (sale.receivable) await transaction.receivable.delete({ where: { id: sale.receivable.id } })
    await transaction.saleItem.deleteMany({ where: { saleId } })

    const updated = await transaction.sale.update({
      where: { id: saleId },
      data: {
        customerId: data.customerId,
        paymentMethod: data.paymentMethod,
        paymentCondition: data.paymentCondition,
        totalAmount,
        items: {
          create: data.items.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId)!
            const unitPrice = Number(item.unitPrice ?? product.salePrice)
            return {
              productId: item.productId,
              productName: item.productName || product.name,
              quantity: item.quantity,
              unit: item.unit || product.unit || 'UN',
              unitPrice,
              discount: item.discount ?? 0,
              subtotal: Math.max(unitPrice * item.quantity - Number(item.discount ?? 0), 0),
            }
          }),
        },
      },
      include: { items: true, customer: true },
    })

    for (const item of data.items) {
      await transaction.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
      await transaction.stockMovement.create({
        data: { type: 'OUT', quantity: item.quantity, reason: 'Venda editada', productId: item.productId, companyId },
      })
    }
    if (data.paymentCondition === 'INSTALLMENT') {
      await transaction.receivable.create({
        data: {
          companyId,
          customerId: data.customerId,
          saleId,
          description: `Venda #${saleId.slice(0, 8)}`,
          totalAmount,
          paymentMethod: data.paymentMethod,
          installments: { create: buildInstallments(totalAmount, data.installmentsCount, new Date(data.firstDueDate!)) },
        },
      })
    } else {
      await transaction.financialTransaction.create({
        data: { companyId, saleId, description: `Venda #${saleId.slice(0, 8)}`, amount: totalAmount, type: 'INCOME', status: 'PAID', paidAt: new Date() },
      })
    }
    return updated
  })
}
