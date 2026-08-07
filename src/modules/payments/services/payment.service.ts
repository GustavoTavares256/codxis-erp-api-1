import type { Prisma } from '@prisma/client'
import type { z } from 'zod'

import { prisma } from '../../../shared/database/prisma'
import { AppError } from '../../../shared/errors/app-error'
import type {
  createReceivableSchema,
  receivePaymentSchema,
  updateInstallmentSchema,
  updateReceivableSchema,
} from '../schemas/payment.schema'
import { buildInstallments } from './installment-calculator'

const details = {
  customer: { select: { id: true, name: true } },
  sale: { select: { id: true, paymentMethod: true, paymentCondition: true, createdAt: true } },
  installments: {
    orderBy: { number: 'asc' as const },
    include: { receipts: { orderBy: { receivedAt: 'desc' as const } } },
  },
}

type DetailedReceivable = Prisma.ReceivableGetPayload<{ include: typeof details }>

export async function listReceivablesService(companyId: string) {
  const rows = await prisma.receivable.findMany({
    where: { companyId },
    include: details,
    orderBy: { createdAt: 'desc' },
  })

  return rows.map(toPaymentResponse)
}

export async function paymentSummaryService(companyId: string) {
  const rows = await prisma.paymentInstallment.findMany({
    where: {
      receivable: { companyId, status: { not: 'CANCELED' } },
      status: { not: 'CANCELED' },
    },
  })
  const today = startOfToday()
  const dueSoonLimit = new Date(today)
  dueSoonLimit.setDate(dueSoonLimit.getDate() + 7)

  return rows.reduce((result, row) => {
    const amount = Number(row.amount)
    const paid = Number(row.paidAmount)
    const balance = Math.max(amount - paid, 0)
    result.totalReceivable += balance
    result.totalReceived += paid
    if (row.dueDate < today && row.status !== 'PAID') result.totalOverdue += balance
    if (row.dueDate >= today && row.dueDate <= dueSoonLimit && row.status !== 'PAID') result.dueSoon += balance
    return result
  }, { totalReceivable: 0, totalReceived: 0, totalOverdue: 0, dueSoon: 0 })
}

export async function createReceivableService(
  companyId: string,
  data: z.infer<typeof createReceivableSchema>,
) {
  const installments = resolveInstallments(data)

  const row = await prisma.receivable.create({
    data: {
      companyId,
      customerId: data.customerId,
      description: data.description,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      installments: { create: installments },
    },
    include: details,
  })

  return toPaymentResponse(row)
}

export async function updateReceivableService(
  companyId: string,
  id: string,
  data: z.infer<typeof updateReceivableSchema>,
) {
  const current = await prisma.receivable.findFirst({
    where: { id, companyId },
    include: { installments: { include: { receipts: true } } },
  })
  if (!current) throw new AppError('Conta a receber não encontrada', 404)
  if (current.saleId) throw new AppError('Edite as condições pela venda vinculada', 409)

  const changesInstallments = data.totalAmount !== undefined ||
    data.installmentCount !== undefined || data.firstDueDate !== undefined ||
    data.installments !== undefined || data.paymentTerm !== undefined
  if (changesInstallments && current.installments.some((item) => item.receipts.length > 0)) {
    throw new AppError('Não é possível recalcular parcelas com recebimentos', 409)
  }

  const totalAmount = data.totalAmount ?? Number(current.totalAmount)
  const installments = changesInstallments
    ? resolveInstallments({
        customerId: data.customerId,
        description: data.description ?? current.description,
        totalAmount,
        paymentMethod: data.paymentMethod ?? current.paymentMethod,
        paymentTerm: data.paymentTerm ?? (current.installments.length > 1 ? 'INSTALLMENTS' : 'CASH'),
        installmentCount: data.installmentCount ?? current.installments.length,
        firstDueDate: data.firstDueDate ?? current.installments[0]?.dueDate,
        notes: data.notes,
        installments: data.installments,
      })
    : null

  const updated = await prisma.$transaction(async (transaction) => {
    if (installments) {
      await transaction.paymentInstallment.deleteMany({ where: { receivableId: id } })
    }
    return transaction.receivable.update({
      where: { id },
      data: {
        customerId: data.customerId,
        description: data.description,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        ...(installments ? { installments: { create: installments } } : {}),
      },
      include: details,
    })
  })

  return toPaymentResponse(updated)
}

export async function updateInstallmentService(
  companyId: string,
  id: string,
  data: z.infer<typeof updateInstallmentSchema>,
) {
  const row = await prisma.paymentInstallment.findFirst({ where: { id, receivable: { companyId } } })
  if (!row) throw new AppError('Parcela não encontrada', 404)
  if (data.amount !== undefined && data.amount < Number(row.paidAmount)) {
    throw new AppError('O valor não pode ser menor que o valor já recebido', 409)
  }
  const updated = await prisma.paymentInstallment.update({ where: { id }, data })
  const installments = await prisma.paymentInstallment.findMany({ where: { receivableId: row.receivableId } })
  await prisma.receivable.update({
    where: { id: row.receivableId },
    data: { totalAmount: installments.reduce((sum, item) => sum + Number(item.amount), 0) },
  })
  return updated
}

export async function deleteReceivableService(companyId: string, id: string) {
  const row = await prisma.receivable.findFirst({
    where: { id, companyId },
    include: { installments: { include: { receipts: true } } },
  })
  if (!row) throw new AppError('Conta a receber não encontrada', 404)
  if (row.saleId) throw new AppError('Contas de vendas devem ser canceladas pela venda', 409)
  if (row.installments.some((item) => item.receipts.length)) {
    throw new AppError('Não é possível excluir uma conta com recebimentos', 409)
  }
  return prisma.receivable.delete({ where: { id } })
}

export async function receivePaymentService(
  companyId: string,
  userId: string,
  id: string,
  data: z.infer<typeof receivePaymentSchema>,
) {
  return prisma.$transaction(async (transaction) => {
    const row = await transaction.paymentInstallment.findFirst({
      where: { id, receivable: { companyId } },
      include: { receivable: true },
    })
    if (!row || row.status === 'CANCELED') throw new AppError('Parcela não encontrada', 404)
    const balance = Number(row.amount) - Number(row.paidAmount)
    if (data.amount > balance + 0.001) throw new AppError('O valor recebido é maior que o saldo da parcela', 409)
    const paid = Number(row.paidAmount) + data.amount
    const receipt = await transaction.paymentReceipt.create({
      data: { ...data, companyId, userId, installmentId: id },
    })
    await transaction.paymentInstallment.update({
      where: { id },
      data: { paidAmount: paid, status: paid + 0.001 >= Number(row.amount) ? 'PAID' : 'PARTIALLY_PAID' },
    })
    await refreshStatus(transaction, row.receivableId)
    await transaction.financialTransaction.create({
      data: {
        companyId,
        paymentReceiptId: receipt.id,
        description: `Recebimento: ${row.receivable.description} - parcela ${row.number}`,
        amount: data.amount,
        type: 'INCOME',
        status: 'PAID',
        paidAt: data.receivedAt,
      },
    })
    return receipt
  })
}

export async function deleteReceiptService(companyId: string, id: string) {
  return prisma.$transaction(async (transaction) => {
    const receipt = await transaction.paymentReceipt.findFirst({
      where: { id, companyId },
      include: { installment: true },
    })
    if (!receipt) throw new AppError('Recebimento não encontrado', 404)
    await transaction.financialTransaction.deleteMany({ where: { paymentReceiptId: id } })
    await transaction.paymentReceipt.delete({ where: { id } })
    const paid = Math.max(Number(receipt.installment.paidAmount) - Number(receipt.amount), 0)
    await transaction.paymentInstallment.update({
      where: { id: receipt.installmentId },
      data: { paidAmount: paid, status: paid > 0 ? 'PARTIALLY_PAID' : 'PENDING' },
    })
    await refreshStatus(transaction, receipt.installment.receivableId)
    return receipt
  })
}

function resolveInstallments(data: z.infer<typeof createReceivableSchema>) {
  if (data.installments) {
    const sum = data.installments.reduce((total, item) => total + item.amount, 0)
    if (Math.abs(sum - data.totalAmount) > 0.001) {
      throw new AppError('A soma das parcelas deve ser igual ao valor total', 400)
    }
    return data.installments.map((item, index) => ({ ...item, number: index + 1 }))
  }
  return buildInstallments(
    data.totalAmount,
    data.paymentTerm === 'INSTALLMENTS' ? data.installmentCount : 1,
    new Date(data.firstDueDate!),
  )
}

function toPaymentResponse(row: DetailedReceivable) {
  const paidAmount = row.installments.reduce((sum, item) => sum + Number(item.paidAmount), 0)
  const outstandingAmount = Math.max(Number(row.totalAmount) - paidAmount, 0)
  const today = startOfToday()
  const hasOverdue = row.installments.some((item) =>
    item.dueDate < today && item.status !== 'PAID' && item.status !== 'CANCELED')

  return {
    ...row,
    totalAmount: Number(row.totalAmount),
    paidAmount,
    outstandingAmount,
    paymentMethod: row.sale?.paymentMethod ?? row.paymentMethod,
    paymentTerm: row.installments.length > 1 ? 'INSTALLMENTS' : 'CASH',
    status: row.status === 'PARTIALLY_PAID' ? 'PARTIAL' : hasOverdue ? 'OVERDUE' : row.status,
    installments: row.installments.map((item) => ({
      ...item,
      amount: Number(item.amount),
      paidAmount: Number(item.paidAmount),
      status: item.status === 'PARTIALLY_PAID'
        ? 'PARTIAL'
        : item.dueDate < today && item.status === 'PENDING' ? 'OVERDUE' : item.status,
      paidAt: item.status === 'PAID' ? item.receipts[0]?.receivedAt ?? null : null,
      receipts: item.receipts.map((receipt) => ({ ...receipt, amount: Number(receipt.amount) })),
    })),
  }
}

async function refreshStatus(transaction: Prisma.TransactionClient, id: string) {
  const rows = await transaction.paymentInstallment.findMany({ where: { receivableId: id } })
  const status = rows.every((row) => row.status === 'PAID')
    ? 'PAID'
    : rows.some((row) => Number(row.paidAmount) > 0) ? 'PARTIALLY_PAID' : 'PENDING'
  await transaction.receivable.update({ where: { id }, data: { status } })
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}
