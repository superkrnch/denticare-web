<template>
  <div>
    <div class="card p-6 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="label">Report Type</label>
          <select v-model="reportType" class="input">
            <option value="patients">Patient Report</option>
            <option value="appointments">Appointment Report</option>
            <option value="revenue">Revenue Report</option>
            <option value="treatments">Treatment Report</option>
          </select>
        </div>
        <div>
          <label class="label">Start Date</label>
          <input v-model="startDate" type="date" class="input" />
        </div>
        <div>
          <label class="label">End Date</label>
          <input v-model="endDate" type="date" class="input" />
        </div>
        <div class="flex items-end gap-2">
          <button class="btn-primary flex-1" @click="generateReport">Generate</button>
          <button class="btn-secondary" :disabled="!reportData.length" @click="exportPDF">Export PDF</button>
          <button class="btn-secondary" :disabled="!reportData.length" @click="printReport">Print</button>
        </div>
      </div>
    </div>

    <DataTable :columns="reportColumns" :items="reportData" :loading="loading" :empty-title="'Generate a report to view data'" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePatientsStore } from '@/stores/patients'
import { useAppointmentsStore } from '@/stores/appointments'
import { useBillingStore } from '@/stores/billing'
import { useTreatmentsStore } from '@/stores/treatments'
import { formatDate, formatCurrency } from '@/utils/helpers'
import { exportTableToPDF } from '@/utils/pdfExport'
import DataTable from '@/components/common/DataTable.vue'

const patients = usePatientsStore()
const appointments = useAppointmentsStore()
const billing = useBillingStore()
const treatments = useTreatmentsStore()

const reportType = ref('patients')
const startDate = ref('')
const endDate = ref('')
const reportData = ref([])
const loading = ref(false)

const columnMaps = {
  patients: [
    { key: 'name', label: 'Name' },
    { key: 'contactNumber', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'age', label: 'Age' },
    { key: 'sex', label: 'Sex' },
  ],
  appointments: [
    { key: 'appointmentId', label: 'ID' },
    { key: 'patientName', label: 'Patient' },
    { key: 'serviceType', label: 'Service' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
  ],
  revenue: [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'patientName', label: 'Patient' },
    { key: 'totalAmount', label: 'Total' },
    { key: 'paidAmount', label: 'Paid' },
    { key: 'paymentStatus', label: 'Status' },
  ],
  treatments: [
    { key: 'patientName', label: 'Patient' },
    { key: 'procedureName', label: 'Procedure' },
    { key: 'cost', label: 'Cost' },
    { key: 'status', label: 'Status' },
  ],
}

const reportColumns = computed(() => columnMaps[reportType.value])

onMounted(async () => {
  const now = new Date()
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  startDate.value = monthAgo.toISOString().split('T')[0]
  endDate.value = now.toISOString().split('T')[0]
  await Promise.all([
    patients.fetchPatients(true),
    appointments.fetchAppointments(),
    billing.fetchBillings(),
    treatments.fetchAll(),
  ])
})

function inDateRange(dateStr) {
  if (!startDate.value || !endDate.value) return true
  return dateStr >= startDate.value && dateStr <= endDate.value
}

async function generateReport() {
  loading.value = true
  switch (reportType.value) {
    case 'patients':
      reportData.value = patients.patients
        .filter((p) => !p.archived)
        .map((p) => ({
          name: [p.firstName, p.lastName].join(' '),
          contactNumber: p.contactNumber,
          email: p.email || '—',
          age: p.age,
          sex: p.sex,
        }))
      break
    case 'appointments':
      reportData.value = appointments.appointments
        .filter((a) => inDateRange(a.date))
        .map((a) => ({ ...a, date: formatDate(a.date) }))
      break
    case 'revenue':
      reportData.value = billing.billings
        .filter((b) => {
          const d = b.createdAt?.toDate?.()
          if (!d) return true
          const ds = d.toISOString().split('T')[0]
          return inDateRange(ds)
        })
        .map((b) => ({
          ...b,
          totalAmount: formatCurrency(b.totalAmount),
          paidAmount: formatCurrency(b.paidAmount),
        }))
      break
    case 'treatments':
      reportData.value = treatments.treatments.map((t) => ({
        ...t,
        cost: formatCurrency(t.cost),
      }))
      break
  }
  loading.value = false
}

function exportPDF() {
  exportTableToPDF({
    title: `${reportType.value.charAt(0).toUpperCase() + reportType.value.slice(1)} Report`,
    columns: reportColumns.value,
    rows: reportData.value,
    filename: `${reportType.value}-report.pdf`,
  })
}

function printReport() {
  exportPDF()
}
</script>
