import * as XLSX from 'xlsx'

import { prisma } from '../../../shared/database/prisma'
import { generateReportPdf } from '../../reports/services/report-pdf.service'
import {
  PRODUCT_IMPORT_EXPORT_FIELDS,
  escapeCsvValue,
} from './product-import-export.utils'

type ExportProductsFormat = 'csv' | 'xlsx' | 'pdf'

export async function exportProductsService(
  companyId: string,
  format: ExportProductsFormat,
) {
  const [company, products] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: {
        id: companyId,
      },
      select: {
        name: true,
        fantasyName: true,
        document: true,
        logoUrl: true,
      },
    }),
    prisma.product.findMany({
      where: {
        companyId,
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ])

  const rows = products.map((product) => ({
    code: product.code || '',
    name: product.name,
    description: product.description || '',
    salePackage: product.salePackage || '',
    salePackageQuantity: product.salePackageQuantity?.toString() || '',
    purchasePrice: product.purchasePrice?.toString() || '',
    costPrice: product.costPrice.toString(),
    markupPercent: product.markupPercent?.toString() || '',
    salePrice: product.salePrice.toString(),
    profitMarginPercent: product.profitMarginPercent?.toString() || '',
    barcode: product.barcode || '',
    taxableBarcode: product.taxableBarcode || '',
    captureWeightOnScale: product.captureWeightOnScale ? 'true' : 'false',
    quantity: product.stock,
    minimumStock: product.minimumStock,
    expirationDate: product.expirationDate
      ? product.expirationDate.toISOString().slice(0, 10)
      : '',
    commissionPercent: product.commissionPercent?.toString() || '',
    factoryReference: product.factoryReference || '',
    grossWeightKg: product.grossWeightKg?.toString() || '',
    netWeightKg: product.netWeightKg?.toString() || '',
    lengthCm: product.lengthCm?.toString() || '',
    widthCm: product.widthCm?.toString() || '',
    heightCm: product.heightCm?.toString() || '',
    brand: product.brand || '',
    supplierPackage: product.supplierPackage || '',
    supplierPackageQuantity: product.supplierPackageQuantity?.toString() || '',
    unit: product.unit || 'UN',
    category: product.category?.name || '',
    sku: product.sku || '',
    sizeColorGrid: product.sizeColorGrid || '',
    imageUrl: product.imageUrl || '',
    isActive: product.isActive ? 'true' : 'false',
  }))

  if (format === 'pdf') {
    const buffer = await generateReportPdf({
      title: 'Relatorio de Produtos',
      company,
      totals: [
        {
          label: 'Total de produtos',
          value: String(products.length),
        },
      ],
      columns: [
        { key: 'name', label: 'Nome', width: 145 },
        { key: 'category', label: 'Categoria', width: 95 },
        { key: 'salePrice', label: 'Preco venda', width: 85, align: 'right' },
        { key: 'quantity', label: 'Qtd.', width: 55, align: 'right' },
        { key: 'unit', label: 'Un.', width: 45 },
        { key: 'minimumStock', label: 'Min.', width: 55, align: 'right' },
      ],
      rows: rows.map((row) => ({
        name: row.name,
        category: row.category || '-',
        salePrice: formatCurrency(Number(row.salePrice)),
        quantity: row.quantity,
        unit: row.unit,
        minimumStock: row.minimumStock,
      })),
    })

    return {
      contentType: 'application/pdf',
      filename: 'produtos.pdf',
      buffer,
    }
  }

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [...PRODUCT_IMPORT_EXPORT_FIELDS],
    })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos')

    return {
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'produtos.xlsx',
      buffer: XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      }) as Buffer,
    }
  }

  const csv = [
    PRODUCT_IMPORT_EXPORT_FIELDS.join(','),
    ...rows.map((row) =>
      PRODUCT_IMPORT_EXPORT_FIELDS.map((field) => escapeCsvValue(row[field])).join(','),
    ),
  ].join('\n')

  return {
    contentType: 'text/csv; charset=utf-8',
    filename: 'produtos.csv',
    buffer: Buffer.from(`\uFEFF${csv}`, 'utf8'),
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
