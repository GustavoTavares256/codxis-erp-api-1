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

const optionalString = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined
    if (typeof value !== 'string') return value

    const trimmed = value.trim()

    return trimmed || undefined
  },
  z.string().optional(),
)
const optionalNumber = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === '') return undefined
    if (typeof value === 'string' && value.trim() === '') return undefined

    return value
  },
  z.coerce.number().finite().nonnegative().optional(),
)
const optionalPercent = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === '') return undefined
    if (typeof value === 'string' && value.trim() === '') return undefined

    return value
  },
  z.coerce.number().finite().min(0).optional(),
)
const optionalUuid = z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.string().uuid().optional(),
)

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

  categoryId: optionalUuid,
  category: optionalString,
  supplierId: optionalUuid,
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export const updateProductSchema = createProductSchema.partial()
export type UpdateProductInput = z.infer<typeof updateProductSchema>
