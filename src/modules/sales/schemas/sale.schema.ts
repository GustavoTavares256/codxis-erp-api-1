import { z } from 'zod'
import { productUnitSchema } from '../../products/schemas/product.schema'

export const createSaleSchema = z.object({
  customerId: z.string().uuid().optional(),

  paymentMethod: z.enum([
    'PIX',
    'CASH',
    'CARD',
  ]),
  paymentCondition: z.enum(['CASH', 'INSTALLMENT']).optional(),
  paymentTerm: z.enum(['CASH', 'INSTALLMENTS']).optional(),
  installmentsCount: z.coerce.number().int().min(1).max(120).optional(),
  installmentCount: z.coerce.number().int().min(1).max(120).optional(),
  firstDueDate: z.coerce.date().optional(),

  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        productName: z.string().min(1).optional(),
        quantity: z.number().int().positive(),
        unit: productUnitSchema.optional(),
        unitPrice: z.coerce.number().positive().optional(),
        discount: z.coerce.number().min(0).default(0),
      }),
    )
    .min(1),
}).transform((data) => ({
  ...data,
  paymentCondition: data.paymentCondition ?? (data.paymentTerm === 'INSTALLMENTS' ? 'INSTALLMENT' : 'CASH'),
  installmentsCount: data.installmentsCount ?? data.installmentCount ?? 1,
}))

export type CreateSaleInput = z.infer<
  typeof createSaleSchema
>
