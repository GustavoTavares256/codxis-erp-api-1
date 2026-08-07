import assert from 'node:assert/strict'
import test from 'node:test'
import { addMonths, buildInstallments } from '../../src/modules/payments/services/installment-calculator'

test('divide o total em centavos sem perder ou criar valor', () => {
  const rows = buildInstallments(100, 3, new Date('2026-01-10T12:00:00Z'))
  assert.deepEqual(rows.map(row => row.amount), [33.34, 33.33, 33.33])
  assert.equal(Math.round(rows.reduce((sum, row) => sum + row.amount, 0) * 100), 10000)
})

test('gera números sequenciais e vencimentos mensais', () => {
  const rows = buildInstallments(40, 4, new Date('2026-08-07T12:00:00Z'))
  assert.deepEqual(rows.map(row => row.number), [1, 2, 3, 4])
  assert.deepEqual(rows.map(row => row.dueDate.toISOString().slice(0, 10)), ['2026-08-07','2026-09-07','2026-10-07','2026-11-07'])
})

test('ajusta vencimento no fim do mês sem pular mês', () => {
  assert.equal(addMonths(new Date('2026-01-31T12:00:00Z'), 1).toISOString().slice(0, 10), '2026-02-28')
  assert.equal(addMonths(new Date('2028-01-31T12:00:00Z'), 1).toISOString().slice(0, 10), '2028-02-29')
})

test('rejeita valores e quantidades inválidos', () => {
  assert.throws(() => buildInstallments(0, 2, new Date()), /positivo/)
  assert.throws(() => buildInstallments(10, 0, new Date()), /entre 1 e 120/)
  assert.throws(() => buildInstallments(10, 121, new Date()), /entre 1 e 120/)
})
