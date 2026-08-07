import assert from 'node:assert/strict'
import test from 'node:test'

import { createReceivableSchema, receivePaymentSchema } from '../../src/modules/payments/schemas/payment.schema'
import { createSaleSchema } from '../../src/modules/sales/schemas/sale.schema'

const productId = '11111111-1111-4111-8111-111111111111'

test('aceita venda parcelada válida', () => {
  const value = createSaleSchema.parse({ paymentMethod: 'PIX', paymentCondition: 'INSTALLMENT', installmentsCount: 3, firstDueDate: '2026-09-10', items: [{ productId, quantity: 1 }] })
  assert.equal(value.installmentsCount, 3)
  assert.equal(value.paymentCondition, 'INSTALLMENT')
})

test('rejeita mais de 120 parcelas', () => {
  assert.equal(createSaleSchema.safeParse({ paymentMethod: 'PIX', paymentCondition: 'INSTALLMENT', installmentsCount: 121, firstDueDate: '2026-09-10', items: [{ productId, quantity: 1 }] }).success, false)
})

test('valida conta e recebimento positivos', () => {
  assert.equal(createReceivableSchema.safeParse({ description: 'Mensalidade', totalAmount: 100, installments: [{ amount: 100, dueDate: '2026-09-10' }] }).success, true)
  assert.equal(receivePaymentSchema.safeParse({ amount: 0, paymentMethod: 'PIX' }).success, false)
})

test('aceita o contrato de venda enviado pelo frontend', () => {
  const value = createSaleSchema.parse({ paymentMethod: 'CARD', paymentTerm: 'INSTALLMENTS', installmentCount: 4, firstDueDate: '2026-09-10', items: [{ productId, quantity: 1 }] })
  assert.equal(value.paymentCondition, 'INSTALLMENT')
  assert.equal(value.installmentsCount, 4)
})

test('aceita conta parcelada no formato do frontend', () => {
  const value = createReceivableSchema.parse({ description: 'Pedido 10', totalAmount: 200, paymentMethod: 'PIX', paymentTerm: 'INSTALLMENTS', installmentCount: 2, firstDueDate: '2026-09-10' })
  assert.equal(value.installmentCount, 2)
  assert.equal(value.paymentTerm, 'INSTALLMENTS')
})
