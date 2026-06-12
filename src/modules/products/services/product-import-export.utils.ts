import { AppError } from '../../../shared/errors/app-error'

export const PRODUCT_IMPORT_EXPORT_FIELDS = [
  'code',
  'name',
  'description',
  'salePackage',
  'salePackageQuantity',
  'purchasePrice',
  'costPrice',
  'markupPercent',
  'salePrice',
  'profitMarginPercent',
  'barcode',
  'taxableBarcode',
  'captureWeightOnScale',
  'quantity',
  'minimumStock',
  'expirationDate',
  'commissionPercent',
  'factoryReference',
  'grossWeightKg',
  'netWeightKg',
  'lengthCm',
  'widthCm',
  'heightCm',
  'brand',
  'supplierPackage',
  'supplierPackageQuantity',
  'unit',
  'category',
  'sku',
  'sizeColorGrid',
  'imageUrl',
  'isActive',
] as const

export const PRODUCT_UNITS = [
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
] as const

export type ProductImportExportField =
  (typeof PRODUCT_IMPORT_EXPORT_FIELDS)[number]

export type ProductImportRow = Record<ProductImportExportField, string>

export type ProductImportError = {
  row: number
  field?: string
  message: string
}

export const REQUIRED_PRODUCT_IMPORT_FIELDS: ProductImportExportField[] = [
  'name',
  'salePrice',
  'quantity',
]

const PRODUCT_IMPORT_HEADER_ALIASES: Record<string, ProductImportExportField> = {
  ativo: 'isActive',
  barcode: 'barcode',
  brand: 'brand',
  captureweightonscale: 'captureWeightOnScale',
  categoria: 'category',
  category: 'category',
  codigo: 'code',
  codigobarras: 'barcode',
  codigointerno: 'code',
  code: 'code',
  comissao: 'commissionPercent',
  commissionpercent: 'commissionPercent',
  comprimentocm: 'lengthCm',
  costprice: 'costPrice',
  custo: 'costPrice',
  descricao: 'description',
  description: 'description',
  ean: 'barcode',
  embalagemfornecedor: 'supplierPackage',
  embalagemvenda: 'salePackage',
  estoque: 'quantity',
  estoqueminimo: 'minimumStock',
  expirationdate: 'expirationDate',
  factoryreference: 'factoryReference',
  foto: 'imageUrl',
  gradetamanhocor: 'sizeColorGrid',
  grossweightkg: 'grossWeightKg',
  gtin: 'barcode',
  gtintributavel: 'taxableBarcode',
  alturacm: 'heightCm',
  imageurl: 'imageUrl',
  imagem: 'imageUrl',
  isactive: 'isActive',
  larguracm: 'widthCm',
  lengthcm: 'lengthCm',
  marca: 'brand',
  margemlucro: 'profitMarginPercent',
  markup: 'markupPercent',
  markuppercent: 'markupPercent',
  minimo: 'minimumStock',
  minimumstock: 'minimumStock',
  name: 'name',
  netweightkg: 'netWeightKg',
  nome: 'name',
  pesobrutokg: 'grossWeightKg',
  pesoliquidokg: 'netWeightKg',
  preco: 'salePrice',
  precocompra: 'purchasePrice',
  precocusto: 'costPrice',
  precovenda: 'salePrice',
  produto: 'name',
  profitmarginpercent: 'profitMarginPercent',
  purchaseprice: 'purchasePrice',
  quantidade: 'quantity',
  quantidadeembalagemfornecedor: 'supplierPackageQuantity',
  quantidadeembalagemvenda: 'salePackageQuantity',
  quantity: 'quantity',
  referenciafabrica: 'factoryReference',
  saleprice: 'salePrice',
  salepackage: 'salePackage',
  salepackagequantity: 'salePackageQuantity',
  sizecolorgrid: 'sizeColorGrid',
  sku: 'sku',
  stock: 'quantity',
  supplierpackage: 'supplierPackage',
  supplierpackagequantity: 'supplierPackageQuantity',
  taxablebarcode: 'taxableBarcode',
  unidade: 'unit',
  unit: 'unit',
  validade: 'expirationDate',
  widthcm: 'widthCm',
}

export function escapeCsvValue(value: unknown) {
  const normalized = value === null || value === undefined ? '' : String(value)
  const escaped = normalized.replace(/"/g, '""')

  return /[",\r\n;]/.test(escaped) ? `"${escaped}"` : escaped
}

export function parseCsv(buffer: Buffer): ProductImportRow[] {
  const content = stripBom(buffer.toString('utf8')).trim()

  if (!content) return []

  const rows = parseCsvContent(content, detectCsvDelimiter(content))
  const [headerRow, ...dataRows] = rows
  const headerMap = headerRow.map((item) => normalizeHeader(item))

  return dataRows
    .filter((row) => row.some((value) => value.trim()))
    .map((row) =>
      PRODUCT_IMPORT_EXPORT_FIELDS.reduce((record, field) => {
        const index = headerMap.indexOf(field)
        record[field] = index >= 0 ? (row[index] || '').trim() : ''
        return record
      }, {} as ProductImportRow),
    )
}

function parseCsvContent(content: string, delimiter: ',' | ';') {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const nextChar = content[index + 1]

    if (char === '"' && quoted && nextChar === '"') {
      value += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === delimiter && !quoted) {
      row.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && nextChar === '\n') index += 1
      row.push(value)
      rows.push(row)
      row = []
      value = ''
      continue
    }

    value += char
  }

  row.push(value)
  rows.push(row)

  return rows
}

function detectCsvDelimiter(content: string): ',' | ';' {
  const firstLine = content.split(/\r?\n/, 1)[0] || ''
  const commaCount = (firstLine.match(/,/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length

  return semicolonCount > commaCount ? ';' : ','
}

export function normalizeProductImportHeader(value: string) {
  const normalized = value
    .trim()
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  return PRODUCT_IMPORT_HEADER_ALIASES[normalized] || null
}

function normalizeHeader(value: string) {
  return normalizeProductImportHeader(value)
}

function stripBom(value: string) {
  return value.replace(/^\uFEFF/, '')
}

export function assertSupportedImportFile(filename: string, mimetype: string) {
  const lowerFilename = filename.toLowerCase()
  const supportedExtension =
    lowerFilename.endsWith('.csv') ||
    lowerFilename.endsWith('.xlsx') ||
    lowerFilename.endsWith('.xls')
  const supportedMime =
    mimetype.includes('csv') ||
    mimetype.includes('spreadsheet') ||
    mimetype.includes('excel') ||
    mimetype.includes('octet-stream')

  if (!supportedExtension && !supportedMime) {
    throw new AppError('Arquivo invalido. Envie um CSV ou XLSX.', 400)
  }
}
