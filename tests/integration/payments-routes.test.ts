import assert from 'node:assert/strict'
import test from 'node:test'
import { buildApp } from '../../src/app'

test('health check inicia a API',async()=>{const app=buildApp();const response=await app.inject({method:'GET',url:'/health'});assert.equal(response.statusCode,200);assert.deepEqual(response.json(),{status:'ok'});await app.close()})
test('rotas de pagamentos existem e exigem autenticação',async()=>{const app=buildApp();const response=await app.inject({method:'GET',url:'/payments'});assert.notEqual(response.statusCode,404);assert.equal(response.statusCode,401);await app.close()})
