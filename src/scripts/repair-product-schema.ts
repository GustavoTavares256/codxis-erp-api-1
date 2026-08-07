import 'dotenv/config'

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
})

const env = envSchema.parse(process.env)
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(
    env.DATABASE_URL.replace(/^mysql:\/\//, 'mariadb://'),
  ),
})

type ColumnDefinition = {
  table: string
  column: string
  definition: string
}

const productUnitDefinition =
  "ENUM('UN', 'CX', 'PC', 'KG', 'G', 'TON', 'L', 'ML', 'M', 'CM', 'M2', 'M3', 'SC', 'FD') NOT NULL DEFAULT 'UN'"

const columns: ColumnDefinition[] = [
  {
    table: 'products',
    column: 'unit',
    definition: productUnitDefinition,
  },
  {
    table: 'products',
    column: 'code',
    definition: 'VARCHAR(191) NULL',
  },
  {
    table: 'products',
    column: 'salePackage',
    definition: 'VARCHAR(191) NULL',
  },
  {
    table: 'products',
    column: 'salePackageQuantity',
    definition: 'DECIMAL(10, 3) NULL',
  },
  {
    table: 'products',
    column: 'purchasePrice',
    definition: 'DECIMAL(10, 2) NULL',
  },
  {
    table: 'products',
    column: 'markupPercent',
    definition: 'DECIMAL(10, 2) NULL',
  },
  {
    table: 'products',
    column: 'profitMarginPercent',
    definition: 'DECIMAL(10, 2) NULL',
  },
  {
    table: 'products',
    column: 'taxableBarcode',
    definition: 'VARCHAR(191) NULL',
  },
  {
    table: 'products',
    column: 'captureWeightOnScale',
    definition: 'BOOLEAN NOT NULL DEFAULT false',
  },
  {
    table: 'products',
    column: 'expirationDate',
    definition: 'DATETIME(3) NULL',
  },
  {
    table: 'products',
    column: 'commissionPercent',
    definition: 'DECIMAL(10, 2) NULL',
  },
  {
    table: 'products',
    column: 'factoryReference',
    definition: 'VARCHAR(191) NULL',
  },
  {
    table: 'products',
    column: 'grossWeightKg',
    definition: 'DECIMAL(10, 3) NULL',
  },
  {
    table: 'products',
    column: 'netWeightKg',
    definition: 'DECIMAL(10, 3) NULL',
  },
  {
    table: 'products',
    column: 'lengthCm',
    definition: 'DECIMAL(10, 2) NULL',
  },
  {
    table: 'products',
    column: 'widthCm',
    definition: 'DECIMAL(10, 2) NULL',
  },
  {
    table: 'products',
    column: 'heightCm',
    definition: 'DECIMAL(10, 2) NULL',
  },
  {
    table: 'products',
    column: 'brand',
    definition: 'VARCHAR(191) NULL',
  },
  {
    table: 'products',
    column: 'supplierPackage',
    definition: 'VARCHAR(191) NULL',
  },
  {
    table: 'products',
    column: 'supplierPackageQuantity',
    definition: 'DECIMAL(10, 3) NULL',
  },
  {
    table: 'products',
    column: 'sizeColorGrid',
    definition: 'TEXT NULL',
  },
  {
    table: 'products',
    column: 'imageUrl',
    definition: 'LONGTEXT NULL',
  },
  {
    table: 'sale_items',
    column: 'unit',
    definition: productUnitDefinition,
  },
  {
    table: 'sale_items',
    column: 'productName',
    definition: 'VARCHAR(191) NULL',
  },
  {
    table: 'sale_items',
    column: 'discount',
    definition: 'DECIMAL(10, 2) NOT NULL DEFAULT 0',
  },
]

async function tableExists(table: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ total: bigint | number }>>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    table,
  )

  return Number(rows[0]?.total ?? 0) > 0
}

async function columnExists(table: string, column: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ total: bigint | number }>>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    table,
    column,
  )

  return Number(rows[0]?.total ?? 0) > 0
}

async function indexExists(table: string, indexName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ total: bigint | number }>>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
    `,
    table,
    indexName,
  )

  return Number(rows[0]?.total ?? 0) > 0
}

async function addMissingColumn({ table, column, definition }: ColumnDefinition) {
  if (!(await tableExists(table))) {
    console.log(`Skipping ${table}.${column}: table does not exist`)
    return
  }

  if (await columnExists(table, column)) {
    console.log(`OK ${table}.${column}`)
    return
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
  )
  console.log(`Added ${table}.${column}`)
}

async function repairProductCodeIndex() {
  if (!(await tableExists('products'))) return
  if (!(await columnExists('products', 'code'))) return
  if (await indexExists('products', 'products_code_idx')) return

  await prisma.$executeRawUnsafe(
    'CREATE INDEX `products_code_idx` ON `products`(`code`)',
  )
  console.log('Added products_code_idx')
}

async function backfillSaleItemProductName() {
  if (!(await tableExists('sale_items'))) return
  if (!(await tableExists('products'))) return
  if (!(await columnExists('sale_items', 'productName'))) return

  await prisma.$executeRawUnsafe(`
    UPDATE \`sale_items\` AS \`saleItem\`
    INNER JOIN \`products\` AS \`product\` ON \`product\`.\`id\` = \`saleItem\`.\`productId\`
    SET \`saleItem\`.\`productName\` = \`product\`.\`name\`
    WHERE \`saleItem\`.\`productName\` IS NULL OR \`saleItem\`.\`productName\` = ''
  `)
  await prisma.$executeRawUnsafe(`
    UPDATE \`sale_items\`
    SET \`productName\` = 'Produto'
    WHERE \`productName\` IS NULL OR \`productName\` = ''
  `)
  await prisma.$executeRawUnsafe(
    'ALTER TABLE `sale_items` MODIFY COLUMN `productName` VARCHAR(191) NOT NULL',
  )
  console.log('Backfilled sale_items.productName')
}

export async function repairProductSchema() {
  for (const column of columns) {
    await addMissingColumn(column)
  }

  await repairProductCodeIndex()
  await backfillSaleItemProductName()
}

export async function disconnectProductSchemaRepair() {
  await prisma.$disconnect()
}

if (require.main === module) {
  repairProductSchema()
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await disconnectProductSchemaRepair()
    })
}
