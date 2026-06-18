import { prisma } from '../../../shared/database/prisma'

export async function dashboardService(companyId: string) {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twelveMonthsStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    productsCount,
    customersCount,
    salesCount,
    lowStockProducts,
    financialTransactions,
    completedSales,
    currentMonthSales,
    previousMonthSales,
    currentMonthExpenses,
    productsWithMovement,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        companyId,
        isActive: true,
      },
    }),

    prisma.customer.count({
      where: {
        companyId,
      },
    }),

    prisma.sale.count({
      where: {
        companyId,
      },
    }),

    prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        minimumStock: true,
      },
    }),

    prisma.financialTransaction.findMany({
      where: {
        companyId,
      },
    }),

    prisma.sale.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
      },
      select: {
        createdAt: true,
        totalAmount: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          select: {
            quantity: true,
            subtotal: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    prisma.sale.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        createdAt: {
          gte: currentMonthStart,
          lt: nextMonthStart,
        },
      },
    }),

    prisma.sale.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),

    prisma.financialTransaction.findMany({
      where: {
        companyId,
        type: 'EXPENSE',
        status: {
          not: 'CANCELED',
        },
        createdAt: {
          gte: currentMonthStart,
          lt: nextMonthStart,
        },
      },
    }),

    prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        _count: {
          select: {
            saleItems: true,
            stockMovements: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ])

  const lowStockItems = lowStockProducts.filter(
    (product) => product.stock <= product.minimumStock,
  )
  const lowStockCount = lowStockItems.length

  const revenue = financialTransactions
    .filter((transaction) => transaction.type === 'INCOME')
    .reduce((acc, transaction) => acc + Number(transaction.amount), 0)

  const expenses = financialTransactions
    .filter((transaction) => transaction.type === 'EXPENSE')
    .reduce((acc, transaction) => acc + Number(transaction.amount), 0)
  const monthlyRevenue = currentMonthSales.reduce(
    (acc, sale) => acc + Number(sale.totalAmount),
    0,
  )
  const previousMonthRevenue = previousMonthSales.reduce(
    (acc, sale) => acc + Number(sale.totalAmount),
    0,
  )
  const monthlyExpenses = currentMonthExpenses.reduce(
    (acc, transaction) => acc + Number(transaction.amount),
    0,
  )
  const monthlyProfit = monthlyRevenue - monthlyExpenses
  const averageTicket =
    currentMonthSales.length > 0 ? monthlyRevenue / currentMonthSales.length : 0
  const monthlyGrowth =
    previousMonthRevenue > 0
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : monthlyRevenue > 0
        ? 100
        : 0
  const monthlySeries = buildMonthlySeries(completedSales, twelveMonthsStart)
  const topProducts = buildTopProducts(completedSales)
  const topCustomers = buildTopCustomers(completedSales)
  const productsWithoutMovement = productsWithMovement.filter(
    (product) =>
      product._count.saleItems === 0 && product._count.stockMovements === 0,
  )

  return {
    products: productsCount,
    customers: customersCount,
    sales: salesCount,
    revenue,
    expenses,
    profit: revenue - expenses,
    lowStock: lowStockCount,
    lowStockProducts: lowStockItems.slice(0, 5).map((product) => ({
      id: product.id,
      name: product.name,
      quantity: product.stock,
      minimumStock: product.minimumStock,
      unit: 'UN',
    })),
    monthlyRevenue,
    monthlyProfit,
    monthlySales: currentMonthSales.length,
    averageTicket,
    monthlyGrowth,
    productsWithoutMovement: productsWithoutMovement.length,
    productsWithoutMovementList: productsWithoutMovement.slice(0, 10).map((product) => ({
      id: product.id,
      name: product.name,
      quantity: product.stock,
      unit: 'UN',
    })),
    salesByMonth: monthlySeries.map((item) => ({
      month: item.month,
      sales: item.sales,
    })),
    revenueByMonth: monthlySeries.map((item) => ({
      month: item.month,
      revenue: item.revenue,
    })),
    topProducts,
    topCustomers,
  }
}

type CompletedSale = {
  createdAt: Date
  totalAmount: unknown
  customer?: {
    id: string
    name: string
  } | null
  items?: Array<{
    quantity: number
    subtotal: unknown
    product: {
      id: string
      name: string
    }
  }>
}

function buildMonthlySeries(sales: CompletedSale[], start: Date) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
  })
  const months = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1)
    const key = getMonthKey(date)

    return {
      key,
      month: formatter.format(date).replace('.', ''),
      sales: 0,
      revenue: 0,
    }
  })
  const monthMap = new Map(months.map((month) => [month.key, month]))

  sales.forEach((sale) => {
    const saleDate = new Date(sale.createdAt)
    const month = monthMap.get(getMonthKey(saleDate))

    if (!month) return

    month.sales += 1
    month.revenue += Number(sale.totalAmount)
  })

  return months
}

function buildTopProducts(sales: CompletedSale[]) {
  const products = new Map<
    string,
    {
      id: string
      name: string
      quantity: number
      revenue: number
      unit: string
    }
  >()

  sales.forEach((sale) => {
    sale.items?.forEach((item) => {
      const current = products.get(item.product.id) || {
        id: item.product.id,
        name: item.product.name,
        quantity: 0,
        revenue: 0,
        unit: 'UN',
      }

      current.quantity += item.quantity
      current.revenue += Number(item.subtotal)
      products.set(item.product.id, current)
    })
  })

  return [...products.values()]
    .sort((first, second) => second.revenue - first.revenue)
    .slice(0, 10)
}

function buildTopCustomers(sales: CompletedSale[]) {
  const customers = new Map<
    string,
    {
      id: string
      name: string
      sales: number
      revenue: number
    }
  >()

  sales.forEach((sale) => {
    if (!sale.customer) return

    const current = customers.get(sale.customer.id) || {
      id: sale.customer.id,
      name: sale.customer.name,
      sales: 0,
      revenue: 0,
    }

    current.sales += 1
    current.revenue += Number(sale.totalAmount)
    customers.set(sale.customer.id, current)
  })

  return [...customers.values()]
    .sort((first, second) => second.revenue - first.revenue)
    .slice(0, 10)
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
