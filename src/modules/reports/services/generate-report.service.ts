import { prisma } from '../../../shared/database/prisma'
import {
  generateReportPdf,
  type ReportMetric,
} from './report-pdf.service'

export type ReportType = 'stock' | 'sales' | 'financial' | 'customers'

type ReportConfig = {
  title: string
  filename: string
  buffer: Buffer
}

export async function generateReportService(
  companyId: string,
  type: ReportType,
): Promise<ReportConfig> {
  const company = await prisma.company.findUniqueOrThrow({
    where: {
      id: companyId,
    },
    select: {
      name: true,
      fantasyName: true,
      document: true,
      logoUrl: true,
    },
  })

  if (type === 'stock') return generateStockReport(companyId, company)
  if (type === 'sales') return generateSalesReport(companyId, company)
  if (type === 'financial') return generateFinancialReport(companyId, company)

  return generateCustomersReport(companyId, company)
}

async function generateStockReport(
  companyId: string,
  company: ReportCompany,
): Promise<ReportConfig> {
  const products = await prisma.product.findMany({
    where: {
      companyId,
      isActive: true,
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })
  const totalQuantity = products.reduce((acc, product) => acc + product.quantity, 0)
  const totalStockValue = products.reduce(
    (acc, product) => acc + Number(product.costPrice) * product.quantity,
    0,
  )
  const lowStock = products.filter(
    (product) => product.quantity <= product.minimumStock,
  ).length

  const buffer = await generateReportPdf({
    title: 'Relatorio de Estoque',
    company,
    totals: [
      metric('Produtos', products.length),
      metric('Quantidade total', totalQuantity),
      metric('Estoque baixo', lowStock),
      metric('Valor em estoque', formatCurrency(totalStockValue)),
    ],
    columns: [
      { key: 'name', label: 'Produto', width: 150 },
      { key: 'sku', label: 'SKU', width: 70 },
      { key: 'category', label: 'Categoria', width: 85 },
      { key: 'quantity', label: 'Qtd.', width: 55, align: 'right' },
      { key: 'minimumStock', label: 'Min.', width: 55, align: 'right' },
      { key: 'unit', label: 'Un.', width: 42 },
      { key: 'costPrice', label: 'Custo', width: 70, align: 'right' },
    ],
    rows: products.map((product) => ({
      name: product.name,
      sku: product.sku || '-',
      category: product.category?.name || '-',
      quantity: product.quantity,
      minimumStock: product.minimumStock,
      unit: product.unit || 'UN',
      costPrice: formatCurrency(Number(product.costPrice)),
    })),
  })

  return report('estoque', buffer)
}

async function generateSalesReport(
  companyId: string,
  company: ReportCompany,
): Promise<ReportConfig> {
  const sales = await prisma.sale.findMany({
    where: {
      companyId,
    },
    include: {
      customer: {
        select: {
          name: true,
        },
      },
      items: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  const completedSales = sales.filter((sale) => sale.status === 'COMPLETED')
  const totalRevenue = completedSales.reduce(
    (acc, sale) => acc + Number(sale.totalAmount),
    0,
  )
  const totalItems = sales.reduce(
    (acc, sale) =>
      acc + sale.items.reduce((itemsAcc, item) => itemsAcc + item.quantity, 0),
    0,
  )

  const buffer = await generateReportPdf({
    title: 'Relatorio de Vendas',
    company,
    totals: [
      metric('Vendas', sales.length),
      metric('Concluidas', completedSales.length),
      metric('Itens vendidos', totalItems),
      metric('Faturamento', formatCurrency(totalRevenue)),
    ],
    columns: [
      { key: 'date', label: 'Data', width: 70 },
      { key: 'customer', label: 'Cliente', width: 160 },
      { key: 'paymentMethod', label: 'Pagamento', width: 80 },
      { key: 'status', label: 'Status', width: 80 },
      { key: 'items', label: 'Itens', width: 55, align: 'right' },
      { key: 'total', label: 'Total', width: 90, align: 'right' },
    ],
    rows: sales.map((sale) => ({
      date: formatDate(sale.createdAt),
      customer: sale.customer?.name || 'Sem cliente',
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      items: sale.items.reduce((acc, item) => acc + item.quantity, 0),
      total: formatCurrency(Number(sale.totalAmount)),
    })),
  })

  return report('vendas', buffer)
}

async function generateFinancialReport(
  companyId: string,
  company: ReportCompany,
): Promise<ReportConfig> {
  const transactions = await prisma.financialTransaction.findMany({
    where: {
      companyId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  const income = transactions
    .filter((transaction) => transaction.type === 'INCOME')
    .reduce((acc, transaction) => acc + Number(transaction.amount), 0)
  const expense = transactions
    .filter((transaction) => transaction.type === 'EXPENSE')
    .reduce((acc, transaction) => acc + Number(transaction.amount), 0)

  const buffer = await generateReportPdf({
    title: 'Relatorio Financeiro',
    company,
    totals: [
      metric('Lancamentos', transactions.length),
      metric('Receitas', formatCurrency(income)),
      metric('Despesas', formatCurrency(expense)),
      metric('Resultado', formatCurrency(income - expense)),
    ],
    columns: [
      { key: 'date', label: 'Data', width: 70 },
      { key: 'description', label: 'Descricao', width: 190 },
      { key: 'type', label: 'Tipo', width: 75 },
      { key: 'status', label: 'Status', width: 80 },
      { key: 'amount', label: 'Valor', width: 105, align: 'right' },
    ],
    rows: transactions.map((transaction) => ({
      date: formatDate(transaction.createdAt),
      description: transaction.description,
      type: transaction.type,
      status: transaction.status,
      amount: formatCurrency(Number(transaction.amount)),
    })),
  })

  return report('financeiro', buffer)
}

async function generateCustomersReport(
  companyId: string,
  company: ReportCompany,
): Promise<ReportConfig> {
  const customers = await prisma.customer.findMany({
    where: {
      companyId,
    },
    include: {
      _count: {
        select: {
          sales: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })
  const customersWithSales = customers.filter(
    (customer) => customer._count.sales > 0,
  ).length

  const buffer = await generateReportPdf({
    title: 'Relatorio de Clientes',
    company,
    totals: [
      metric('Clientes', customers.length),
      metric('Com vendas', customersWithSales),
      metric('Sem vendas', customers.length - customersWithSales),
    ],
    columns: [
      { key: 'name', label: 'Cliente', width: 170 },
      { key: 'document', label: 'Documento', width: 100 },
      { key: 'email', label: 'E-mail', width: 150 },
      { key: 'phone', label: 'Telefone', width: 80 },
      { key: 'sales', label: 'Vendas', width: 50, align: 'right' },
    ],
    rows: customers.map((customer) => ({
      name: customer.name,
      document: customer.document || '-',
      email: customer.email || '-',
      phone: customer.phone || '-',
      sales: customer._count.sales,
    })),
  })

  return report('clientes', buffer)
}

type ReportCompany = {
  name: string
  fantasyName?: string | null
  document?: string | null
  logoUrl?: string | null
}

function metric(label: string, value: string | number): ReportMetric {
  return {
    label,
    value: String(value),
  }
}

function report(name: string, buffer: Buffer): ReportConfig {
  return {
    title: name,
    filename: `relatorio-${name}.pdf`,
    buffer,
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR').format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
