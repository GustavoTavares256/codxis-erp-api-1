import { z } from 'zod'
export const createReceivableSchema = z.object({ customerId: z.string().uuid().optional(), description: z.string().trim().min(1), totalAmount: z.coerce.number().positive(), installments: z.array(z.object({ amount: z.coerce.number().positive(), dueDate: z.coerce.date() })).min(1) })
export const updateInstallmentSchema = z.object({ amount: z.coerce.number().positive().optional(), dueDate: z.coerce.date().optional() })
export const receivePaymentSchema = z.object({ amount: z.coerce.number().positive(), paymentMethod: z.enum(['PIX','CASH','CARD']), receivedAt: z.coerce.date().default(() => new Date()), notes: z.string().trim().max(1000).optional() })
