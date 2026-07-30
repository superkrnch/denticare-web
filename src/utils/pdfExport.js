import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatCurrency, formatDateTime } from './helpers'
import { PAYMENT_METHOD_LABELS } from '@/constants'

const RECEIPT_WIDTH = 80

function receiptText(doc, text, y, { align = 'left', size = 8, style = 'normal', x = RECEIPT_WIDTH / 2 } = {}) {
  doc.setFont('courier', style)
  doc.setFontSize(size)
  const opts = { align }
  if (align === 'left') opts.x = 4
  else if (align === 'right') opts.x = RECEIPT_WIDTH - 4
  else opts.x = x
  doc.text(text, opts.x, y, { align })
  return y
}

function dashedLine(doc, y) {
  doc.setLineDashPattern([1, 1], 0)
  doc.setDrawColor(120)
  doc.line(4, y, RECEIPT_WIDTH - 4, y)
  doc.setLineDashPattern([], 0)
  return y + 3
}

function dottedRow(doc, left, right, y) {
  doc.setFont('courier', 'normal')
  doc.setFontSize(8)
  doc.text(left, 4, y)
  doc.text(right, RECEIPT_WIDTH - 4, y, { align: 'right' })
  const leftW = doc.getTextWidth(left)
  const rightW = doc.getTextWidth(right)
  const startX = 4 + leftW + 2
  const endX = RECEIPT_WIDTH - 4 - rightW - 2
  if (endX > startX) {
    doc.setLineDashPattern([0.3, 0.8], 0)
    doc.setDrawColor(160)
    let x = startX
    while (x < endX) {
      doc.line(x, y - 0.8, Math.min(x + 0.8, endX), y - 0.8)
      x += 1.6
    }
    doc.setLineDashPattern([], 0)
  }
  return y
}

function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || 'Payment'
}

export function exportTableToPDF({ title, columns, rows, filename = 'report.pdf' }) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(title, 14, 20)
  doc.setFontSize(10)
  doc.text(`Generated: ${formatDate(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 28)

  autoTable(doc, {
    startY: 34,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => row[c.key] ?? '')),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 148, 136] },
  })

  doc.save(filename)
}

export function generateInvoicePDF(invoice, clinic) {
  const payments = [...(invoice.payments || [])].sort(
    (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt),
  )
  const lineCount = (invoice.treatments || []).length
  const paymentLines = payments.length * 2
  const height = 95 + lineCount * 9 + paymentLines * 7 + (payments.length ? 12 : 0)

  const doc = new jsPDF({
    unit: 'mm',
    format: [RECEIPT_WIDTH, Math.max(120, height)],
  })

  let y = 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  y = receiptText(doc, (clinic?.name || 'DentiCare Clinic').toUpperCase(), y, { align: 'center', size: 11, style: 'bold' }) + 5

  doc.setFont('courier', 'normal')
  doc.setFontSize(7)
  if (clinic?.address) {
    y = receiptText(doc, clinic.address, y, { align: 'center', size: 7 }) + 3.5
  }
  if (clinic?.phone) {
    y = receiptText(doc, `Tel: ${clinic.phone}`, y, { align: 'center', size: 7 }) + 4
  }

  y = dashedLine(doc, y)
  y = receiptText(doc, 'OFFICIAL RECEIPT', y + 2, { align: 'center', size: 9, style: 'bold' }) + 4
  y = dashedLine(doc, y)

  const created = invoice.createdAt?.toDate?.() || invoice.createdAt
  const meta = [
    ['Receipt No.', invoice.invoiceNumber],
    ['Date', created ? formatDateTime(created) : '—'],
    ['Patient', invoice.patientName],
    ['Status', String(invoice.paymentStatus || '').toUpperCase()],
  ]

  doc.setFontSize(7.5)
  for (const [label, value] of meta) {
    doc.setFont('courier', 'normal')
    doc.text(label, 4, y)
    doc.text(String(value), RECEIPT_WIDTH - 4, y, { align: 'right' })
    y += 4
  }

  y = dashedLine(doc, y + 1)

  for (const t of invoice.treatments || []) {
    y = dottedRow(doc, t.procedureName, formatCurrency(t.cost), y + 1) + 3.5
    if (t.toothNumber) {
      doc.setFontSize(6.5)
      doc.setTextColor(100)
      doc.text(`  Tooth #${t.toothNumber}`, 4, y)
      doc.setTextColor(0)
      y += 3.5
    }
  }

  y = dashedLine(doc, y + 1)
  y = dottedRow(doc, 'Subtotal', formatCurrency(invoice.totalAmount), y + 1) + 4
  y = dottedRow(doc, 'Amount Paid', formatCurrency(invoice.paidAmount), y) + 4
  doc.setFont('courier', 'bold')
  y = dottedRow(doc, 'Balance Due', formatCurrency(invoice.remainingBalance), y) + 2
  doc.setFont('courier', 'normal')

  if (payments.length) {
    y = dashedLine(doc, y + 1)
    y = receiptText(doc, 'PAYMENT HISTORY', y + 1, { align: 'center', size: 7, style: 'bold' }) + 4

    for (const p of payments) {
      const date = p.recordedAt?.toDate?.() || p.recordedAt
      y = dottedRow(doc, date ? formatDateTime(date) : '—', formatCurrency(p.amount), y) + 3
      doc.setFontSize(6.5)
      doc.setTextColor(100)
      const note = [paymentMethodLabel(p.method), p.notes].filter(Boolean).join(' · ')
      doc.text(`  ${note}`, 4, y)
      doc.setTextColor(0)
      doc.setFontSize(7.5)
      y += 3.5
    }
  }

  y = dashedLine(doc, y + 2)
  y = receiptText(doc, 'Thank you for choosing us!', y + 2, { align: 'center', size: 7.5 }) + 3.5
  receiptText(doc, 'Please keep this receipt for your records.', y, { align: 'center', size: 6.5 })

  return doc
}
