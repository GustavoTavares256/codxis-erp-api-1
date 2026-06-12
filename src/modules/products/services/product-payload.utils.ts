import type { Prisma } from '@prisma/client'

import { prisma } from '../../../shared/database/prisma'
import type {
  CreateProductInput,
  UpdateProductInput,
} from '../schemas/product.schema'

type ProductPayloadInput = CreateProductInput | UpdateProductInput

type ProductPayloadOptions = {
  companyId: string
  transaction?: Prisma.TransactionClient
  fallbackCategory?: boolean
}

export async function buildProductPayload(
  input: ProductPayloadInput,
  options: ProductPayloadOptions,
) {
  const client = options.transaction || prisma
  const data = { ...input }
  const categoryId =
    data.categoryId ||
    (data.category || options.fallbackCategory
      ? await findOrCreateCategory(client, options.companyId, data.category || 'geral')
      : undefined)
  const stock = data.stock ?? data.quantity
  const imageUrl = data.imageUrl || data.image
  const commercial = calculateCommercialFields(data)

  return removeUndefined({
    code: data.code,
    name: data.name,
    description: data.description,
    sku: data.sku || data.code,
    salePackage: data.salePackage,
    salePackageQuantity: data.salePackageQuantity,
    purchasePrice: data.purchasePrice,
    costPrice: commercial.costPrice,
    markupPercent: commercial.markupPercent,
    salePrice: commercial.salePrice,
    profitMarginPercent: commercial.profitMarginPercent,
    barcode: data.barcode,
    taxableBarcode: data.taxableBarcode,
    captureWeightOnScale: data.captureWeightOnScale,
    stock,
    minimumStock: data.minimumStock,
    expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
    commissionPercent: data.commissionPercent,
    factoryReference: data.factoryReference,
    grossWeightKg: data.grossWeightKg,
    netWeightKg: data.netWeightKg,
    lengthCm: data.lengthCm,
    widthCm: data.widthCm,
    heightCm: data.heightCm,
    brand: data.brand,
    supplierPackage: data.supplierPackage,
    supplierPackageQuantity: data.supplierPackageQuantity,
    sizeColorGrid: data.sizeColorGrid,
    imageUrl,
    unit: data.unit,
    isActive: data.isActive,
    categoryId,
    supplierId: data.supplierId,
  })
}

async function findOrCreateCategory(
  client: Prisma.TransactionClient | typeof prisma,
  companyId: string,
  name: string,
) {
  const normalizedName = name.trim() || 'geral'
  const existingCategory = await client.category.findFirst({
    where: {
      companyId,
      name: normalizedName,
    },
    select: {
      id: true,
    },
  })

  if (existingCategory) return existingCategory.id

  const category = await client.category.create({
    data: {
      companyId,
      name: normalizedName,
    },
    select: {
      id: true,
    },
  })

  return category.id
}

function calculateCommercialFields(data: ProductPayloadInput) {
  const baseCost = data.costPrice ?? data.purchasePrice ?? 0
  const salePrice =
    data.salePrice ??
    (data.markupPercent !== undefined && baseCost > 0
      ? roundMoney(baseCost * (1 + data.markupPercent / 100))
      : undefined)
  const markupPercent =
    data.markupPercent ??
    (salePrice !== undefined && baseCost > 0
      ? roundPercent(((salePrice - baseCost) / baseCost) * 100)
      : undefined)
  const profitMarginPercent =
    data.profitMarginPercent ??
    (salePrice !== undefined && salePrice > 0 && baseCost >= 0
      ? roundPercent(((salePrice - baseCost) / salePrice) * 100)
      : undefined)

  return {
    costPrice: data.costPrice ?? data.purchasePrice,
    salePrice,
    markupPercent,
    profitMarginPercent,
  }
}

function removeUndefined<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100
}
