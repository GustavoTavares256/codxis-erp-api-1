import assert from 'node:assert/strict'
import test from 'node:test'

import { buildApp } from '../../src/app'

test('health check inicia a API', async () => {
  const app = buildApp()
  const response = await app.inject({ method: 'GET', url: '/health' })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { status: 'ok' })
  await app.close()
})

test('rotas de pagamentos existem e exigem autenticação', async () => {
  const app = buildApp()
  const response = await app.inject({ method: 'GET', url: '/payments' })
  assert.notEqual(response.statusCode, 404)
  assert.equal(response.statusCode, 401)
  await app.close()
})

test('rotas integradas do frontend existem', async () => {
  const app = buildApp()
  const requests = [
    { method: 'PUT', url: '/sales/11111111-1111-4111-8111-111111111111' },
    { method: 'PUT', url: '/payments/11111111-1111-4111-8111-111111111111' },
    { method: 'POST', url: '/payments/11111111-1111-4111-8111-111111111111/installments/22222222-2222-4222-8222-222222222222/receipts' },
    { method: 'GET', url: '/reports/payments/pdf' },
  ] as const
  for (const request of requests) {
    const response = await app.inject(request)
    assert.notEqual(response.statusCode, 404, `${request.method} ${request.url}`)
    assert.equal(response.statusCode, 401)
  }
  await app.close()
})
