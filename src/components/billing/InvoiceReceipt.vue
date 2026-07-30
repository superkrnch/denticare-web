<template>
  <div class="invoice-receipt" :class="{ 'invoice-receipt--print': printMode }">
    <header class="receipt-header">
      <AppLogo size="sm" class="receipt-logo" />
      <h2 class="receipt-clinic">{{ clinic.name || 'DentiCare Clinic' }}</h2>
      <p v-if="clinic.address" class="receipt-meta">{{ clinic.address }}</p>
      <p v-if="clinic.phone" class="receipt-meta">Tel: {{ clinic.phone }}</p>
    </header>

    <div class="receipt-rule receipt-rule--thick" />

    <p class="receipt-title">OFFICIAL RECEIPT</p>

    <div class="receipt-rule" />

    <dl class="receipt-info">
      <div class="receipt-info-row">
        <dt>Receipt No.</dt>
        <dd>{{ invoice.invoiceNumber }}</dd>
      </div>
      <div class="receipt-info-row">
        <dt>Date</dt>
        <dd>{{ invoiceDate }}</dd>
      </div>
      <div class="receipt-info-row">
        <dt>Patient</dt>
        <dd>{{ invoice.patientName }}</dd>
      </div>
      <div class="receipt-info-row">
        <dt>Status</dt>
        <dd class="receipt-status">{{ statusLabel }}</dd>
      </div>
    </dl>

    <div class="receipt-rule" />

    <section class="receipt-items">
      <div v-for="(item, i) in invoice.treatments || []" :key="i" class="receipt-line">
        <div class="receipt-line-main">
          <span class="receipt-line-name">{{ item.procedureName }}</span>
          <span class="receipt-line-dots" aria-hidden="true" />
          <span class="receipt-line-amount">{{ formatCurrency(item.cost) }}</span>
        </div>
        <p v-if="item.toothNumber" class="receipt-line-sub">Tooth #{{ item.toothNumber }}</p>
      </div>
    </section>

    <div class="receipt-rule" />

    <section class="receipt-totals">
      <div class="receipt-total-row">
        <span>Subtotal</span>
        <span class="receipt-total-dots" aria-hidden="true" />
        <span>{{ formatCurrency(invoice.totalAmount) }}</span>
      </div>
      <div class="receipt-total-row">
        <span>Amount Paid</span>
        <span class="receipt-total-dots" aria-hidden="true" />
        <span>{{ formatCurrency(invoice.paidAmount) }}</span>
      </div>
      <div class="receipt-total-row receipt-total-row--due">
        <span>Balance Due</span>
        <span class="receipt-total-dots" aria-hidden="true" />
        <span>{{ formatCurrency(invoice.remainingBalance) }}</span>
      </div>
    </section>

    <template v-if="payments.length">
      <div class="receipt-rule" />
      <section class="receipt-payments">
        <p class="receipt-section-label">Payment History</p>
        <div v-for="payment in payments" :key="payment.id" class="receipt-payment">
          <div class="receipt-payment-main">
            <span>{{ formatPaymentDate(payment.recordedAt) }}</span>
            <span class="receipt-line-dots" aria-hidden="true" />
            <span>{{ formatCurrency(payment.amount) }}</span>
          </div>
          <p class="receipt-payment-sub">
            {{ paymentMethodLabel(payment.method) }}
            <span v-if="payment.notes"> · {{ payment.notes }}</span>
          </p>
        </div>
      </section>
    </template>

    <div class="receipt-rule receipt-rule--thick" />

    <footer class="receipt-footer">
      <p>Thank you for choosing us!</p>
      <p class="receipt-footer-sub">Please keep this receipt for your records.</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS } from '@/constants'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import AppLogo from '@/components/common/AppLogo.vue'

const props = defineProps({
  invoice: { type: Object, required: true },
  clinic: { type: Object, default: () => ({}) },
  printMode: { type: Boolean, default: false },
})

const statusLabel = computed(() => {
  const map = {
    [PAYMENT_STATUS.PAID]: 'PAID',
    [PAYMENT_STATUS.PARTIAL]: 'PARTIAL',
    [PAYMENT_STATUS.UNPAID]: 'UNPAID',
  }
  return map[props.invoice.paymentStatus] || String(props.invoice.paymentStatus || '').toUpperCase()
})

const invoiceDate = computed(() => {
  const d = props.invoice.createdAt
  if (!d) return '—'
  const date = d?.toDate?.() || d
  return formatDateTime(date)
})

const payments = computed(() => {
  const list = props.invoice.payments || []
  return [...list].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt))
})

function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || 'Payment'
}

function formatPaymentDate(value) {
  if (!value) return '—'
  if (value?.toDate) return formatDateTime(value.toDate())
  return formatDateTime(value)
}
</script>

<style scoped>
.invoice-receipt {
  --receipt-ink: #1e293b;
  --receipt-muted: #64748b;
  --receipt-border: #cbd5e1;
  max-width: 22rem;
  margin-inline: auto;
  padding: 1.5rem 1.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--receipt-ink);
  background: #fff;
  border: 1px dashed var(--receipt-border);
  border-radius: 0.25rem;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.06);
}

:global(.dark) .invoice-receipt {
  --receipt-ink: #e2e8f0;
  --receipt-muted: #94a3b8;
  --receipt-border: #475569;
  background: #0f172a;
}

.receipt-header {
  text-align: center;
}

.receipt-logo {
  margin-inline: auto;
  margin-bottom: 0.75rem;
}

.receipt-clinic {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.receipt-meta {
  margin-top: 0.2rem;
  font-size: 0.7rem;
  color: var(--receipt-muted);
}

.receipt-rule {
  margin: 0.85rem 0;
  border-top: 1px dashed var(--receipt-border);
}

.receipt-rule--thick {
  border-top-width: 2px;
}

.receipt-title {
  text-align: center;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.receipt-info {
  display: grid;
  gap: 0.35rem;
}

.receipt-info-row {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.5rem;
}

.receipt-info-row dt {
  color: var(--receipt-muted);
}

.receipt-info-row dd {
  text-align: right;
  word-break: break-word;
}

.receipt-status {
  font-weight: 700;
}

.receipt-items,
.receipt-totals,
.receipt-payments {
  display: grid;
  gap: 0.55rem;
}

.receipt-line-main,
.receipt-total-row,
.receipt-payment-main {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.receipt-line-name {
  flex-shrink: 0;
  max-width: 55%;
}

.receipt-line-dots,
.receipt-total-dots {
  flex: 1;
  min-width: 0.5rem;
  border-bottom: 1px dotted var(--receipt-border);
  margin-bottom: 0.15rem;
}

.receipt-line-amount,
.receipt-total-row span:last-child,
.receipt-payment-main span:last-child {
  flex-shrink: 0;
  font-weight: 600;
}

.receipt-line-sub,
.receipt-payment-sub {
  padding-left: 0.25rem;
  font-size: 0.65rem;
  color: var(--receipt-muted);
}

.receipt-total-row--due span:last-child {
  font-weight: 700;
}

.receipt-section-label {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--receipt-muted);
}

.receipt-footer {
  text-align: center;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.72rem;
}

.receipt-footer-sub {
  margin-top: 0.25rem;
  font-size: 0.65rem;
  color: var(--receipt-muted);
}

@media print {
  .invoice-receipt {
    max-width: 80mm;
    margin: 0 auto;
    padding: 4mm;
    border: none;
    box-shadow: none;
    color: #000;
    background: #fff;
  }
}
</style>
