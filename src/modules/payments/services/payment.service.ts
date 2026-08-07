import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../../shared/database/prisma'
import type { createReceivableSchema, receivePaymentSchema, updateInstallmentSchema } from '../schemas/payment.schema'

const details = { customer: { select: { id: true, name: true } }, sale: { select: { id: true, paymentMethod: true, createdAt: true } }, installments: { orderBy: { number: 'asc' as const }, include: { receipts: { orderBy: { receivedAt: 'desc' as const } } } } }

export const listReceivablesService = (companyId: string) => prisma.receivable.findMany({ where: { companyId }, include: details, orderBy: { createdAt: 'desc' } })

export async function paymentSummaryService(companyId: string) {
  const rows = await prisma.paymentInstallment.findMany({ where: { receivable: { companyId, status: { not: 'CANCELED' } }, status: { not: 'CANCELED' } } })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return rows.reduce((r, row) => { const amount=Number(row.amount), paid=Number(row.paidAmount), balance=Math.max(amount-paid,0); r.total+=amount; r.received+=paid; r.pending+=balance; if(row.dueDate<today&&row.status!=='PAID')r.overdue+=balance; return r }, { total:0, received:0, pending:0, overdue:0 })
}

export async function createReceivableService(companyId: string, data: z.infer<typeof createReceivableSchema>) {
  const sum=data.installments.reduce((total,item)=>total+item.amount,0)
  if(Math.abs(sum-data.totalAmount)>0.01) throw new Error('A soma das parcelas deve ser igual ao valor total')
  return prisma.receivable.create({ data:{ companyId, customerId:data.customerId, description:data.description, totalAmount:data.totalAmount, installments:{create:data.installments.map((item,index)=>({...item,number:index+1}))}}, include:details })
}

export async function updateInstallmentService(companyId:string,id:string,data:z.infer<typeof updateInstallmentSchema>){
  const row=await prisma.paymentInstallment.findFirst({where:{id,receivable:{companyId}}})
  if(!row)throw new Error('Parcela não encontrada')
  if(data.amount!==undefined&&data.amount<Number(row.paidAmount))throw new Error('O valor não pode ser menor que o valor já recebido')
  const updated=await prisma.paymentInstallment.update({where:{id},data})
  const installments=await prisma.paymentInstallment.findMany({where:{receivableId:row.receivableId}})
  await prisma.receivable.update({where:{id:row.receivableId},data:{totalAmount:installments.reduce((sum,item)=>sum+Number(item.amount),0)}})
  return updated
}

export async function deleteReceivableService(companyId:string,id:string){
  const row=await prisma.receivable.findFirst({where:{id,companyId},include:{installments:{include:{receipts:true}}}})
  if(!row)throw new Error('Conta a receber não encontrada')
  if(row.saleId)throw new Error('Contas de vendas devem ser canceladas pela venda')
  if(row.installments.some(item=>item.receipts.length))throw new Error('Não é possível excluir uma conta com recebimentos')
  return prisma.receivable.delete({where:{id}})
}

export async function receivePaymentService(companyId:string,userId:string,id:string,data:z.infer<typeof receivePaymentSchema>){return prisma.$transaction(async tx=>{
  const row=await tx.paymentInstallment.findFirst({where:{id,receivable:{companyId}},include:{receivable:true}})
  if(!row||row.status==='CANCELED')throw new Error('Parcela não encontrada')
  const balance=Number(row.amount)-Number(row.paidAmount); if(data.amount>balance+0.001)throw new Error('O valor recebido é maior que o saldo da parcela')
  const paid=Number(row.paidAmount)+data.amount
  const receipt=await tx.paymentReceipt.create({data:{...data,companyId,userId,installmentId:id}})
  await tx.paymentInstallment.update({where:{id},data:{paidAmount:paid,status:paid+0.001>=Number(row.amount)?'PAID':'PARTIALLY_PAID'}})
  await refreshStatus(tx,row.receivableId)
  await tx.financialTransaction.create({data:{companyId,paymentReceiptId:receipt.id,description:`Recebimento: ${row.receivable.description} - parcela ${row.number}`,amount:data.amount,type:'INCOME',status:'PAID',paidAt:data.receivedAt}})
  return receipt
})}

export async function deleteReceiptService(companyId:string,id:string){return prisma.$transaction(async tx=>{
  const receipt=await tx.paymentReceipt.findFirst({where:{id,companyId},include:{installment:true}}); if(!receipt)throw new Error('Recebimento não encontrado')
  await tx.financialTransaction.deleteMany({where:{paymentReceiptId:id}}); await tx.paymentReceipt.delete({where:{id}}); const paid=Math.max(Number(receipt.installment.paidAmount)-Number(receipt.amount),0)
  await tx.paymentInstallment.update({where:{id:receipt.installmentId},data:{paidAmount:paid,status:paid>0?'PARTIALLY_PAID':'PENDING'}}); await refreshStatus(tx,receipt.installment.receivableId); return receipt
})}

async function refreshStatus(tx:Prisma.TransactionClient,id:string){const rows=await tx.paymentInstallment.findMany({where:{receivableId:id}});const status=rows.every(r=>r.status==='PAID')?'PAID':rows.some(r=>Number(r.paidAmount)>0)?'PARTIALLY_PAID':'PENDING';await tx.receivable.update({where:{id},data:{status}})}
