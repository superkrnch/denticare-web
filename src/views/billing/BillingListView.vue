<template>
  <div>
    <div class="page-header">
      <button class="btn-primary sm:ml-auto" @click="showModal = true">+ Create Invoice</button>
    </div>

    <DataTable :columns="columns" :items="billing.billings" :loading="billing.loading">
      <template #cell-patientName="{ item }">{{ item.patientName }}</template>
      <template #cell-totalAmount="{ item }">{{ formatCurrency(item.totalAmount) }}</template>
      <template #cell-paidAmount="{ item }">{{ formatCurrency(item.paidAmount) }}</template>
      <template #cell-remainingBalance="{ item }">{{ formatCurrency(item.remainingBalance) }}</template>
      <template #cell-paymentStatus="{ item }"><StatusBadge :status="item.paymentStatus" /></template>
      <template #cell-actions="{ item }">
        <router-link :to="`/billing/${item.id}`" class="text-xs text-primary-600 hover:underline">View</router-link>
      </template>
    </DataTable>

    <BaseModal :show="showModal" title="Create Invoice" size="lg" @close="closeModal">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div>
          <label class="label">Patient *</label>
          <select v-model="form.patientId" class="input" required @change="onPatientChange">
            <option value="">Select patient</option>
            <option v-for="p in patientList" :key="p.id" :value="p.id">{{ fullName(p) }}</option>
          </select>
        </div>

        <div v-if="patientAppointmentCharges.length" class="rounded-lg border border-primary-200 bg-primary-50/60 p-3 dark:border-primary-900 dark:bg-primary-950/30">
          <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            From patient appointment requests
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="appt in patientAppointmentCharges"
              :key="appt.id"
              type="button"
              class="btn-secondary text-xs"
              @click="addFromAppointment(appt)"
            >
              {{ appt.serviceType }} — {{ formatCurrency(appt.estimatedCost || presetCost(appt.serviceType)) }}
              <span class="text-slate-500">({{ formatDate(appt.date) }})</span>
            </button>
          </div>
        </div>

        <div>
          <label class="label">Treatment Charges</label>
          <div v-for="(t, i) in form.treatments" :key="i" class="mb-3 space-y-2 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
            <select v-model="t.presetId" class="input" @change="applyPresetToRow(t)">
              <option value="">Select procedure preset</option>
              <option v-for="p in presets" :key="p.id" :value="p.id">
                {{ p.name }} — {{ formatCurrency(p.defaultCost) }}
              </option>
            </select>
            <div class="flex gap-2">
              <input v-model="t.procedureName" class="input flex-1" placeholder="Procedure" required />
              <input v-model.number="t.toothNumber" type="number" class="input w-20" placeholder="Tooth" />
              <input v-model.number="t.cost" type="number" class="input w-28" placeholder="Cost" min="0" step="0.01" required />
              <button type="button" class="btn-danger px-2" @click="form.treatments.splice(i, 1)">×</button>
            </div>
          </div>
          <button type="button" class="btn-secondary text-xs" @click="addChargeRow">
            + Add Charge
          </button>
        </div>

        <div class="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <strong>Total: {{ formatCurrency(computedTotal) }}</strong>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="label">Initial Payment (PHP)</label>
            <input v-model.number="form.paidAmount" type="number" class="input" min="0" step="0.01" />
          </div>
          <div>
            <label class="label">Payment Method</label>
            <select v-model="form.paymentMethod" class="input" :disabled="!form.paidAmount">
              <option value="">Select method</option>
              <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
        </div>

        <div v-if="form.paidAmount > 0">
          <label class="label">Payment Notes (optional)</label>
          <input v-model="form.paymentNotes" class="input" placeholder="e.g. GCash ref #, card terminal receipt" />
        </div>

        <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Creating...' : 'Create Invoice' }}</button>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBillingStore } from '@/stores/billing'
import { usePatientsStore } from '@/stores/patients'
import { useAppointmentsStore } from '@/stores/appointments'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import { PAYMENT_METHODS, PAYMENT_METHOD_OPTIONS } from '@/constants'
import { fullName, formatCurrency, formatDate } from '@/utils/helpers'
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const router = useRouter()
const billing = useBillingStore()
const patients = usePatientsStore()
const appointments = useAppointmentsStore()
const settings = useSettingsStore()
const toast = useToastStore()

const showModal = ref(false)
const saving = ref(false)
const paymentMethods = PAYMENT_METHOD_OPTIONS
const presets = computed(() => settings.treatmentTemplates)

const columns = [
  { key: 'invoiceNumber', label: 'Invoice #' },
  { key: 'patientName', label: 'Patient' },
  { key: 'totalAmount', label: 'Total' },
  { key: 'paidAmount', label: 'Paid' },
  { key: 'remainingBalance', label: 'Balance' },
  { key: 'paymentStatus', label: 'Status' },
  { key: 'actions', label: 'Actions' },
]

const emptyCharge = () => ({ presetId: '', procedureName: '', toothNumber: null, cost: 0 })

const defaultForm = () => ({
  patientId: '',
  patientName: '',
  treatments: [emptyCharge()],
  paidAmount: 0,
  paymentMethod: PAYMENT_METHODS.CASH,
  paymentNotes: '',
})

const form = ref(defaultForm())

const patientList = computed(() => patients.patients.filter((p) => !p.archived))
const computedTotal = computed(() =>
  form.value.treatments.reduce((sum, t) => sum + (Number(t.cost) || 0), 0),
)

const patientAppointmentCharges = computed(() => {
  if (!form.value.patientId) return []
  return appointments.appointments.filter((a) =>
    a.patientId === form.value.patientId
    && ['pending', 'approved'].includes(a.status),
  )
})

onMounted(async () => {
  await Promise.all([
    billing.fetchBillings(),
    patients.fetchPatients(),
    appointments.fetchAppointments(),
    settings.loadTreatmentTemplates(),
  ])

  if (billing.pendingInvoice) {
    form.value.patientId = billing.pendingInvoice.patientId
    onPatientChange()
    form.value.treatments = billing.pendingInvoice.treatments
    showModal.value = true
    billing.setPendingInvoice(null)
  }
})

function presetCost(serviceType) {
  return presets.value.find((p) => p.name === serviceType)?.defaultCost || 0
}

function onPatientChange() {
  const p = patientList.value.find((x) => x.id === form.value.patientId)
  form.value.patientName = p ? fullName(p) : ''
}

function applyPresetToRow(row) {
  const preset = presets.value.find((p) => p.id === row.presetId)
  if (!preset) return
  row.procedureName = preset.name
  row.cost = preset.defaultCost
}

function addChargeRow() {
  form.value.treatments.push(emptyCharge())
}

function addFromAppointment(appt) {
  const preset = presets.value.find((p) => p.name === appt.serviceType)
  form.value.treatments.push({
    presetId: preset?.id || appt.procedureId || '',
    procedureName: appt.serviceType,
    toothNumber: null,
    cost: appt.estimatedCost ?? preset?.defaultCost ?? 0,
  })
}

function closeModal() {
  showModal.value = false
  form.value = defaultForm()
}

async function handleCreate() {
  saving.value = true
  try {
    const id = await billing.createInvoice(form.value)
    toast.success('Invoice created.')
    closeModal()
    await billing.fetchBillings()
    router.push(`/billing/${id}`)
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}
</script>
