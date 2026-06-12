import { z } from 'zod'

export const productUnitSchema = z.enum([
  'UN',
  'CX',
  'PC',
  'KG',
  'G',
  'TON',
  'L',
  'ML',
  'M',
  'CM',
  'M2',
  'M3',
  'SC',
  'FD',
])

const optionalString = z.string().trim().optional().or(z.literal('').transform(() => undefined))
const optionalNumber = z.coerce.number().nonnegative().optional()
const optionalPercent = z.coerce.number().min(0).optional()

export const createProductSchema = z.object({
  name: z.string().min(2),
  description: optionalString,
  code: optionalString,
  sku: optionalString,
  salePackage: optionalString,
  salePackageQuantity: optionalNumber,
  purchasePrice: optionalNumber,
  costPrice: z.coerce.number().nonnegative().default(0),
  markupPercent: optionalPercent,
  salePrice: z.coerce.number().positive(),
  profitMarginPercent: optionalPercent,
  barcode: optionalString,
  taxableBarcode: optionalString,
  captureWeightOnScale: z.coerce.boolean().default(false),
  stock: z.coerce.number().int().min(0).optional(),
  quantity: z.coerce.number().int().min(0).optional(),
  minimumStock: z.coerce.number().int().min(0).default(0),
  expirationDate: optionalString,
  commissionPercent: optionalPercent,
  factoryReference: optionalString,
  grossWeightKg: optionalNumber,
  netWeightKg: optionalNumber,
  lengthCm: optionalNumber,
  widthCm: optionalNumber,
  heightCm: optionalNumber,
  brand: optionalString,
  supplierPackage: optionalString,
  supplierPackageQuantity: optionalNumber,
  sizeColorGrid: optionalString,
  imageUrl: optionalString,
  image: optionalString,
  unit: productUnitSchema.default('UN'),
  isActive: z.coerce.boolean().default(true),

  categoryId: z.string().uuid().optional(),
  category: optionalString,
  supplierId: z.string().uuid().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export const updateProductSchema = createProductSchema.partial()
export type UpdateProductInput = z.infer<typeof updateProductSchema>
