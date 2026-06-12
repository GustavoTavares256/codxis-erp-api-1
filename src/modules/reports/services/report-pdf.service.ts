import PDFDocument from 'pdfkit'

type ReportColumn<T> = {
  key: keyof T
  label: string
  width: number
  align?: 'left' | 'right' | 'center'
}

export type ReportMetric = {
  label: string
  value: string
}

type GenerateReportPdfInput<T extends Record<string, string | number>> = {
  title: string
  company: {
    name: string
    fantasyName?: string | null
    document?: string | null
    logoUrl?: string | null
  }
  columns: ReportColumn<T>[]
  rows: T[]
  totals: ReportMetric[]
}

type GenerateSalesManifestPdfInput = {
  title: string
  company: {
    name: string
    fantasyName?: string | null
    document?: string | null
    logoUrl?: string | null
  }
  periodLabel: string
  sales: Array<{
    customerName: string
    payment: string
    createdAt: Date
    totalAmount: string | number
    items: Array<{
      quantity: number
      unit?: string | null
      productName: string
      unitPrice: string | number
      subtotal?: string | number | null
    }>
  }>
}

const PAGE_MARGIN = 42
const FOOTER_HEIGHT = 34
const PAGE_BOTTOM = PAGE_MARGIN + FOOTER_HEIGHT

export async function generateReportPdf<T extends Record<string, string | number>>(
  input: GenerateReportPdfInput<T>,
) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      bufferPages: true,
      info: {
        Title: input.title,
        Author: 'CodXis ERP',
      },
    })
    const chunks: Buffer[] = []

    document.on('data', (chunk) => chunks.push(chunk as Buffer))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)

    drawHeader(document, input)
    drawTotals(document, input.totals)
    drawTable(document, input.columns, input.rows)
    drawPagination(document)

    document.end()
  })
}

export async function generateSalesManifestPdf(
  input: GenerateSalesManifestPdfInput,
) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      bufferPages: true,
      info: {
        Title: input.title,
        Author: 'CodXis ERP',
      },
    })
    const chunks: Buffer[] = []

    document.on('data', (chunk) => chunks.push(chunk as Buffer))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)

    drawSalesManifestHeader(document, input)

    if (input.sales.length === 0) {
      document
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#667085')
        .text('Nenhum pedido encontrado para este relatorio.', PAGE_MARGIN, document.y)
    } else {
      input.sales.forEach((sale, index) => {
        drawSalesSection(document, sale, index)
      })
    }

    drawPagination(document)
    document.end()
  })
}

function drawHeader<T extends Record<string, string | number>>(
  document: PDFKit.PDFDocument,
  input: GenerateReportPdfInput<T>,
) {
  const companyName = input.company.fantasyName || input.company.name
  const issuedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())

  document
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(input.title, PAGE_MARGIN, PAGE_MARGIN)

  document
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#667085')
    .text(`Emitido em ${issuedAt}`, PAGE_MARGIN, PAGE_MARGIN + 26)

  drawLogo(document, input.company.logoUrl)

  document
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#111827')
    .text(companyName || 'Empresa', PAGE_MARGIN, PAGE_MARGIN + 54)

  document
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#667085')
    .text(input.company.document || 'Documento nao informado', PAGE_MARGIN, PAGE_MARGIN + 70)

  document
    .moveTo(PAGE_MARGIN, PAGE_MARGIN + 94)
    .lineTo(document.page.width - PAGE_MARGIN, PAGE_MARGIN + 94)
    .lineWidth(1)
    .strokeColor('#d9dee7')
    .stroke()

  document.y = PAGE_MARGIN + 112
}

function drawLogo(document: PDFKit.PDFDocument, logoUrl?: string | null) {
  const x = document.page.width - PAGE_MARGIN - 92
  const y = PAGE_MARGIN

  document
    .roundedRect(x, y, 92, 42, 8)
    .lineWidth(1)
    .strokeColor('#d9dee7')
    .stroke()

  if (logoUrl && logoUrl.startsWith('data:image/')) {
    try {
      const [, base64] = logoUrl.split(',')
      document.image(Buffer.from(base64, 'base64'), x + 8, y + 7, {
        fit: [76, 28],
        align: 'center',
        valign: 'center',
      })
      return
    } catch {
      // Fallback to the wordmark below when the stored image is invalid.
    }
  }

  document
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#2563eb')
    .text('CODXIS', x, y + 14, {
      width: 92,
      align: 'center',
    })
}

function drawSalesManifestHeader(
  document: PDFKit.PDFDocument,
  input: GenerateSalesManifestPdfInput,
) {
  const companyName = input.company.fantasyName || input.company.name
  const issuedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())

  document
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(input.title, PAGE_MARGIN, PAGE_MARGIN)

  document
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#111827')
    .text(`Período: ${input.periodLabel}`, PAGE_MARGIN, PAGE_MARGIN + 28)

  document
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#111827')
    .text(`Empresa: ${companyName || 'Empresa'}`, PAGE_MARGIN, PAGE_MARGIN + 46)

  document
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#667085')
    .text(`Data de emissão: ${issuedAt}`, PAGE_MARGIN, PAGE_MARGIN + 64)

  document
    .moveTo(PAGE_MARGIN, PAGE_MARGIN + 88)
    .lineTo(document.page.width - PAGE_MARGIN, PAGE_MARGIN + 88)
    .lineWidth(1)
    .strokeColor('#d9dee7')
    .stroke()

  document.y = PAGE_MARGIN + 108
}

function drawSalesSection(
  document: PDFKit.PDFDocument,
  sale: GenerateSalesManifestPdfInput['sales'][number],
  index: number,
) {
  const sectionNumber = String(index + 1).padStart(2, '0')
  const estimatedHeight = 126 + sale.items.length * 22

  ensureSalesSpace(document, Math.min(estimatedHeight, 220))

  document
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#111827')
    .text(`${sectionNumber} - Cliente: ${sale.customerName}`, PAGE_MARGIN, document.y, {
      width: document.page.width - PAGE_MARGIN * 2,
    })

  document
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#111827')
    .text(`Pagamento: ${sale.payment}`, PAGE_MARGIN, document.y + 4)

  document
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#111827')
    .text(`Data: ${formatSalesDate(sale.createdAt)}`, PAGE_MARGIN, document.y + 4)

  document.moveDown(1)
  document
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111827')
    .text('Produtos')

  document.moveDown(0.35)

  if (sale.items.length === 0) {
    ensureSalesSpace(document, 18)
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#667085')
      .text('Nenhum item registrado neste pedido.', PAGE_MARGIN + 12)
  } else {
    sale.items.forEach((item) => {
      drawSalesItem(document, item)
    })
  }

  ensureSalesSpace(document, 48)
  document.moveDown(0.5)
  document
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111827')
    .text(`Total do pedido: ${formatSalesCurrency(Number(sale.totalAmount))}`, PAGE_MARGIN, document.y)

  document.moveDown(0.7)
  document
    .moveTo(PAGE_MARGIN, document.y)
    .lineTo(document.page.width - PAGE_MARGIN, document.y)
    .dash(3, { space: 3 })
    .strokeColor('#98a2b3')
    .lineWidth(1)
    .stroke()
    .undash()

  document.moveDown(1)
}

function drawSalesItem(
  document: PDFKit.PDFDocument,
  item: GenerateSalesManifestPdfInput['sales'][number]['items'][number],
) {
  ensureSalesSpace(document, 22)

  const quantity = String(item.quantity).padStart(2, '0')
  const unit = formatSalesUnit(item.unit)
  const text = `${quantity} ${unit} de ${item.productName} a ${formatSalesCurrency(Number(item.unitPrice))}`

  document
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#111827')
    .text(text, PAGE_MARGIN + 12, document.y, {
      width: document.page.width - PAGE_MARGIN * 2 - 12,
    })

  document.moveDown(0.45)
}

function ensureSalesSpace(document: PDFKit.PDFDocument, height: number) {
  if (document.y + height > document.page.height - PAGE_BOTTOM) {
    document.addPage()
  }
}

function formatSalesDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR').format(value)
}

function formatSalesCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatSalesUnit(unit?: string | null) {
  const normalized = String(unit || '').trim().toUpperCase()

  if (!normalized || normalized === 'UN') return 'UN'
  if (normalized === 'PC') return 'Pcs'

  return normalized
}

function drawTotals(document: PDFKit.PDFDocument, totals: ReportMetric[]) {
  if (totals.length === 0) return

  const usableWidth = document.page.width - PAGE_MARGIN * 2
  const gap = 8
  const cardWidth = (usableWidth - gap * (totals.length - 1)) / totals.length
  const startY = document.y

  totals.forEach((metric, index) => {
    const x = PAGE_MARGIN + index * (cardWidth + gap)

    document
      .roundedRect(x, startY, cardWidth, 50, 8)
      .fillAndStroke('#f6f7f9', '#d9dee7')

    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#667085')
      .text(metric.label, x + 10, startY + 10, {
        width: cardWidth - 20,
      })

    document
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#111827')
      .text(metric.value, x + 10, startY + 27, {
        width: cardWidth - 20,
      })
  })

  document.y = startY + 68
}

function drawTable<T extends Record<string, string | number>>(
  document: PDFKit.PDFDocument,
  columns: ReportColumn<T>[],
  rows: T[],
) {
  const headerHeight = 26
  const rowHeight = 25

  drawTableHeader(document, columns, headerHeight)

  if (rows.length === 0) {
    document
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#667085')
      .text('Nenhum registro encontrado para este relatorio.', PAGE_MARGIN, document.y + 12)
    return
  }

  rows.forEach((row, index) => {
    if (document.y + rowHeight + FOOTER_HEIGHT > document.page.height - PAGE_MARGIN) {
      document.addPage()
      drawTableHeader(document, columns, headerHeight)
    }

    const y = document.y
    const fill = index % 2 === 0 ? '#ffffff' : '#f9fafb'

    document
      .rect(PAGE_MARGIN, y, document.page.width - PAGE_MARGIN * 2, rowHeight)
      .fill(fill)

    let x = PAGE_MARGIN
    columns.forEach((column) => {
      document
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#111827')
        .text(String(row[column.key] ?? ''), x + 6, y + 8, {
          width: column.width - 12,
          align: column.align || 'left',
          ellipsis: true,
        })

      x += column.width
    })

    document.y = y + rowHeight
  })
}

function drawTableHeader<T extends Record<string, string | number>>(
  document: PDFKit.PDFDocument,
  columns: ReportColumn<T>[],
  height: number,
) {
  const y = document.y

  document
    .roundedRect(PAGE_MARGIN, y, document.page.width - PAGE_MARGIN * 2, height, 6)
    .fill('#111827')

  let x = PAGE_MARGIN

  columns.forEach((column) => {
    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#ffffff')
      .text(column.label, x + 6, y + 9, {
        width: column.width - 12,
        align: column.align || 'left',
      })

    x += column.width
  })

  document.y = y + height
}

function drawPagination(document: PDFKit.PDFDocument) {
  const range = document.bufferedPageRange()

  for (let index = range.start; index < range.start + range.count; index += 1) {
    document.switchToPage(index)

    const pageNumber = index - range.start + 1
    const text = `Pagina ${pageNumber} de ${range.count}`

    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#667085')
      .text(text, PAGE_MARGIN, document.page.height - PAGE_MARGIN + 12, {
        width: document.page.width - PAGE_MARGIN * 2,
        align: 'right',
      })

    document
      .moveTo(PAGE_MARGIN, document.page.height - PAGE_MARGIN)
      .lineTo(document.page.width - PAGE_MARGIN, document.page.height - PAGE_MARGIN)
      .strokeColor('#d9dee7')
      .lineWidth(1)
      .stroke()
  }
}
