import { prisma } from '../../../shared/database/prisma'
import { AppError } from '../../../shared/errors/app-error'
import {
  generateReportPdf,
  generateSalesManifestPdf,
  type ReportMetric,
} from './report-pdf.service'

export type ReportType = 'stock' | 'sales' | 'financial' | 'customers'

export type ReportFilters = {
  date?: string
  startDate?: string
  endDate?: string
}

type ReportConfig = {
  title: string
  filename: string
  buffer: Buffer
}

export async function generateReportService(
  companyId: string,
  type: ReportType,
  filters: ReportFilters = {},
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
  if (type === 'sales') return generateSalesReport(companyId, company, filters)
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
  const totalQuantity = products.reduce((acc, product) => acc + product.stock, 0)
  const totalStockValue = products.reduce(
    (acc, product) => acc + Number(product.costPrice) * product.stock,
    0,
  )
  const lowStock = products.filter(
    (product) => product.stock <= product.minimumStock,
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
      quantity: product.stock,
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
  filters: ReportFilters,
): Promise<ReportConfig> {
  const period = resolveSalesPeriod(filters)

  const sales = await prisma.sale.findMany({
    where: {
      companyId,
      createdAt: {
        gte: period.start,
        lt: period.end,
      },
    },
    include: {
      customer: {
        select: {
          name: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              name: true,
              unit: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const buffer = await generateSalesManifestPdf({
    title: 'Relatório de Vendas Detalhado',
    company,
    periodLabel: period.label,
    sales: sales.map((sale) => ({
      customerName: sale.customer?.name || 'Sem cliente',
      payment: formatPaymentMethod(sale.paymentMethod),
      createdAt: sale.createdAt,
      totalAmount: sale.totalAmount.toString(),
      items: sale.items.map((item) => ({
        quantity: item.quantity,
        unit: item.unit,
        productName: item.productName,
        unitPrice: item.unitPrice.toString(),
        subtotal: item.subtotal?.toString(),
      })),
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
  const installments = await prisma.paymentInstallment.findMany({
    where: { receivable: { companyId, status: { not: 'CANCELED' } }, status: { not: 'CANCELED' } },
    include: { receivable: { include: { customer: { select: { name: true } } } } },
    orderBy: { dueDate: 'asc' },
  })
  const income = transactions
    .filter((transaction) => transaction.type === 'INCOME')
    .reduce((acc, transaction) => acc + Number(transaction.amount), 0)
  const expense = transactions
    .filter((transaction) => transaction.type === 'EXPENSE')
    .reduce((acc, transaction) => acc + Number(transaction.amount), 0)
  const pending = installments.reduce((acc, item) => acc + Math.max(Number(item.amount) - Number(item.paidAmount), 0), 0)
  const overdue = installments.filter(item => item.dueDate < new Date() && item.status !== 'PAID').reduce((acc, item) => acc + Math.max(Number(item.amount) - Number(item.paidAmount), 0), 0)

  const buffer = await generateReportPdf({
    title: 'Relatorio Financeiro',
    company,
    totals: [
      metric('Lancamentos', transactions.length),
      metric('Receitas', formatCurrency(income)),
      metric('Despesas', formatCurrency(expense)),
      metric('Resultado', formatCurrency(income - expense)),
      metric('A receber', formatCurrency(pending)),
      metric('Em atraso', formatCurrency(overdue)),
    ],
    columns: [
      { key: 'date', label: 'Data', width: 70 },
      { key: 'description', label: 'Descricao', width: 190 },
      { key: 'type', label: 'Tipo', width: 75 },
      { key: 'status', label: 'Status', width: 80 },
      { key: 'amount', label: 'Valor', width: 105, align: 'right' },
    ],
    rows: [...transactions.map((transaction) => ({
      date: formatDate(transaction.createdAt),
      description: transaction.description,
      type: transaction.type,
      status: transaction.status,
      amount: formatCurrency(Number(transaction.amount)),
    })), ...installments.filter(item => item.status !== 'PAID').map(item => ({
      date: formatDate(item.dueDate),
      description: `${item.receivable.customer?.name || 'Sem cliente'} - ${item.receivable.description} (${item.number})`,
      type: 'A RECEBER',
      status: item.dueDate < new Date() ? 'ATRASADO' : item.status,
      amount: formatCurrency(Math.max(Number(item.amount) - Number(item.paidAmount), 0)),
    }))],
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

function formatPaymentMethod(value: string) {
  const labels: Record<string, string> = {
    PIX: 'PIX',
    CASH: 'Dinheiro',
    CARD: 'Cartao',
  }

  return labels[value] || value
}

const BRAZIL_TIME_ZONE = 'America/Sao_Paulo'

type SalesPeriod = {
  start: Date
  end: Date
  label: string
}

function resolveSalesPeriod(filters: ReportFilters): SalesPeriod {
  if (filters.date) {
    return buildSingleDayPeriod(filters.date)
  }

  if (filters.startDate && filters.endDate) {
    return buildDateRangePeriod(filters.startDate, filters.endDate)
  }

  return buildSingleDayPeriod(getTodayInBrazil())
}

function buildSingleDayPeriod(date: string): SalesPeriod {
  return {
    start: startOfBrazilDate(date),
    end: startOfBrazilDate(addDays(date, 1)),
    label: formatPeriodDate(date),
  }
}

function buildDateRangePeriod(startDate: string, endDate: string): SalesPeriod {
  if (startDate > endDate) {
    throw new AppError('startDate nao pode ser maior que endDate')
  }

  return {
    start: startOfBrazilDate(startDate),
    end: startOfBrazilDate(addDays(endDate, 1)),
    label: `${formatPeriodDate(startDate)} até ${formatPeriodDate(endDate)}`,
  }
}

function startOfBrazilDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)

  return zonedDateTimeToUtc(year, month, day)
}

function zonedDateTimeToUtc(year: number, month: number, day: number) {
  const utcGuess = Date.UTC(year, month - 1, day)
  const firstResult = new Date(utcGuess - getTimeZoneOffsetMs(new Date(utcGuess)))
  const secondOffset = getTimeZoneOffsetMs(firstResult)

  return new Date(utcGuess - secondOffset)
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )

  const localAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  )

  return localAsUtc - date.getTime()
}

function getTodayInBrazil() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return `${values.year}-${values.month}-${values.day}`
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + days))

  return [
    result.getUTCFullYear(),
    String(result.getUTCMonth() + 1).padStart(2, '0'),
    String(result.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function formatPeriodDate(date: string) {
  const [year, month, day] = date.split('-')

  return `${day}/${month}/${year}`
}
