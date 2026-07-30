<template>
  <div v-if="invoice" class="billing-detail">
    <div class="page-header no-print">
      <div class="flex gap-2 sm:ml-auto">
        <button class="btn-secondary" @click="printReceipt">Print</button>
        <button class="btn-secondary" @click="downloadPdf">Download PDF</button>
        <router-link to="/billing" class="btn-secondary">Back</router-link>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="card p-6 lg:col-span-2 screen-invoice">
        <div class="mb-6">
          <h2 class="text-lg font-bold text-primary-700 dark:text-primary-300">{{ settings.settings.clinicName }}</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ settings.settings.address }}</p>
        </div>

        <table class="mb-6 w-full text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/80">
            <tr>
              <th class="px-3 py-2 text-left">Procedure</th>
              <th class="px-3 py-2 text-left">Tooth</th>
              <th class="px-3 py-2 text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, i) in invoice.treatments" :key="i" class="border-b border-slate-100 dark:border-slate-800">
              <td class="px-3 py-2">{{ t.procedureName }}</td>
              <td class="px-3 py-2">{{ t.toothNumber || '—' }}</td>
              <td class="px-3 py-2 text-right">{{ formatCurrency(t.cost) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="space-y-1 text-right text-sm">
          <p>Total: <strong>{{ formatCurrency(invoice.totalAmount) }}</strong></p>
          <p>Paid: <strong>{{ formatCurrency(invoice.paidAmount) }}</strong></p>
          <p>Balance: <strong class="text-red-600 dark:text-red-400">{{ formatCurrency(invoice.remainingBalance) }}</strong></p>
          <StatusBadge :status="invoice.paymentStatus" />
        </div>

        <div v-if="paymentHistory.length" class="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
          <h3 class="mb-3 font-semibold text-slate-800 dark:text-slate-100">Payment History</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th class="px-2 py-2">Date</th>
                  <th class="px-2 py-2">Method</th>
                  <th class="px-2 py-2 text-right">Amount</th>
                  <th class="px-2 py-2">Recorded by</th>
                  <th class="px-2 py-2">Notes</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="payment in paymentHistory" :key="payment.id">
                  <td class="px-2 py-2.5 whitespace-nowrap">{{ formatPaymentDate(payment.recordedAt) }}</td>
                  <td class="px-2 py-2.5">{{ paymentMethodLabel(payment.method) }}</td>
                  <td class="px-2 py-2.5 text-right font-medium">{{ formatCurrency(payment.amount) }}</td>
                  <td class="px-2 py-2.5">{{ payment.recordedByName || '—' }}</td>
                  <td class="px-2 py-2.5 text-slate-500 dark:text-slate-400">{{ payment.notes || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="space-y-6 no-print">
        <div class="card p-6">
          <h3 class="mb-4 font-semibold text-slate-800 dark:text-slate-100">Record Payment</h3>
          <form class="space-y-4" @submit.prevent="handlePayment">
            <div>
              <label class="label">Amount (PHP)</label>
              <input
                v-model.number="paymentAmount"
                type="number"
                class="input"
                required
                min="0.01"
                step="0.01"
                :max="invoice.remainingBalance"
              />
              <p class="mt-1 text-xs text-slate-500">Balance due: {{ formatCurrency(invoice.remainingBalance) }}</p>
            </div>
            <div>
              <label class="label">Payment Method *</label>
              <select v-model="paymentMethod" class="input" required>
                <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>
            <div>
              <label class="label">Reference / Notes</label>
              <input
                v-model="paymentNotes"
                class="input"
                placeholder="e.g. GCash ref #1234, terminal receipt"
              />
            </div>
            <button type="submit" class="btn-teal w-full" :disabled="paying || invoice.paymentStatus === 'paid'">
              {{ paying ? 'Processing...' : 'Record Payment' }}
            </button>
          </form>
        </div>

        <div class="card p-5 text-sm text-slate-600 dark:text-slate-300">
          <h4 class="mb-2 font-semibold text-slate-800 dark:text-slate-100">Payment methods</h4>
          <ul class="space-y-1 text-xs text-slate-500 dark:text-slate-400">
            <li><strong class="text-slate-700 dark:text-slate-200">In-store:</strong> Cash, Card</li>
            <li><strong class="text-slate-700 dark:text-slate-200">Digital:</strong> GCash, Maya, Bank Transfer</li>
            <li><strong class="text-slate-700 dark:text-slate-200">Online:</strong> Record when patient pays via link or portal</li>
          </ul>
        </div>
      </div>
    </div>

    <div id="invoice-print" class="print-only-receipt" aria-hidden="true">
      <InvoiceReceipt :invoice="invoice" :clinic="clinicInfo" print-mode />
    </div>
  </div>
  <LoadingSpinner v-else :show="true" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from '@/constants'
import { useBillingStore } from '@/stores/billing'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import { usePageStore } from '@/stores/page'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { generateInvoicePDF } from '@/utils/pdfExport'
import InvoiceReceipt from '@/components/billing/InvoiceReceipt.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const billing = useBillingStore()
const settings = useSettingsStore()
const toast = useToastStore()
const pageStore = usePageStore()

const invoice = ref(null)
const paymentAmount = ref(0)
const paymentMethod = ref(PAYMENT_METHODS.CASH)
const paymentNotes = ref('')
const paying = ref(false)
const paymentMethods = PAYMENT_METHOD_OPTIONS

const clinicInfo = computed(() => ({
  name: settings.settings.clinicName,
  address: settings.settings.address,
  phone: settings.settings.phone,
}))

const paymentHistory = computed(() => {
  const list = invoice.value?.payments || []
  return [...list].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
})

onMounted(async () => {
  await settings.loadSettings()
  await loadInvoice()
})

onUnmounted(() => {
  pageStore.clearHeader()
})

async function loadInvoice() {
  const invoiceId = route.params.id
  const snap = await getDoc(doc(db, COLLECTIONS.BILLINGS, invoiceId))
  if (!snap.exists() || route.params.id !== invoiceId) return

  invoice.value = { id: snap.id, ...snap.data() }
  pageStore.setHeader({
    title: `Invoice ${invoice.value.invoiceNumber}`,
    subtitle: invoice.value.patientName,
    forRoute: route.path,
  })
}

function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '—'
}

function formatPaymentDate(value) {
  if (!value) return '—'
  if (value?.toDate) return formatDateTime(value.toDate())
  return formatDateTime(value)
}

async function handlePayment() {
  paying.value = true
  try {
    await billing.recordPayment(route.params.id, {
      amount: paymentAmount.value,
      method: paymentMethod.value,
      notes: paymentNotes.value,
    })
    await loadInvoice()
    paymentAmount.value = 0
    paymentNotes.value = ''
    toast.success('Payment recorded.')
  } catch (e) {
    toast.error(e.message)
  } finally {
    paying.value = false
  }
}

function printReceipt() {
  window.print()
}

function downloadPdf() {
  const pdf = generateInvoicePDF(invoice.value, clinicInfo.value)
  pdf.save(`${invoice.value.invoiceNumber}.pdf`)
}
</script>

<style>
.print-only-receipt {
  display: none;
}

@media print {
  body * {
    visibility: hidden;
  }

  #invoice-print,
  #invoice-print * {
    visibility: visible;
  }

  #invoice-print {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }

  .screen-invoice,
  .no-print {
    display: none !important;
  }
}
</style>
