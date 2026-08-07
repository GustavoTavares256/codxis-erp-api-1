import { z } from 'zod'

const installmentSchema = z.object({
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
})

const receivableFields = z.object({
    customerId: z.string().uuid().optional(),
    description: z.string().trim().min(1),
    totalAmount: z.coerce.number().positive(),
    paymentMethod: z.enum(['PIX', 'CASH', 'CARD']).default('PIX'),
    paymentTerm: z.enum(['CASH', 'INSTALLMENTS']).default('CASH'),
    installmentCount: z.coerce.number().int().min(1).max(120).default(1),
    firstDueDate: z.coerce.date().optional(),
    notes: z.string().trim().max(1000).optional(),
  installments: z.array(installmentSchema).min(1).optional(),
})

export const createReceivableSchema = receivableFields.superRefine((data, context) => {
    if (!data.installments && !data.firstDueDate) {
      context.addIssue({
        code: 'custom',
        message: 'Informe o primeiro vencimento',
        path: ['firstDueDate'],
      })
    }
})

export const updateReceivableSchema = receivableFields.partial().extend({
  description: z.string().trim().min(1).optional(),
  totalAmount: z.coerce.number().positive().optional(),
})

export const updateInstallmentSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  dueDate: z.coerce.date().optional(),
})

export const receivePaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(['PIX', 'CASH', 'CARD']),
  receivedAt: z.coerce.date().default(() => new Date()),
  notes: z.string().trim().max(1000).optional(),
})
