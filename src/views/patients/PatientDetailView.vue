<template>
  <div v-if="patient">
    <div class="page-header">
      <div class="flex gap-2 sm:ml-auto">
        <router-link :to="`/patients/${patient.id}/edit`" class="btn-secondary">Edit</router-link>
        <router-link to="/patients" class="btn-secondary">Back</router-link>
      </div>
    </div>

    <div class="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
        :class="activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Personal Info -->
    <div v-if="activeTab === 'info'" class="card p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">Birthdate:</span> {{ formatDate(patient.birthdate) }}</div>
        <div><span class="text-slate-500">Age:</span> {{ patient.age }}</div>
        <div><span class="text-slate-500">Sex:</span> <span class="capitalize">{{ patient.sex }}</span></div>
        <div><span class="text-slate-500">Contact:</span> {{ patient.contactNumber }}</div>
        <div class="sm:col-span-2"><span class="text-slate-500">Address:</span> {{ patient.address || '—' }}</div>
        <div><span class="text-slate-500">Emergency Contact:</span> {{ patient.emergencyContact || '—' }}</div>
        <div class="sm:col-span-2"><span class="text-slate-500">Medical Conditions:</span> {{ patient.medicalConditions || 'None' }}</div>
        <div class="sm:col-span-2"><span class="text-slate-500">Allergies:</span> {{ patient.allergies || 'None' }}</div>
        <div class="sm:col-span-2"><span class="text-slate-500">Medications:</span> {{ patient.currentMedications || 'None' }}</div>
      </div>
    </div>

    <!-- Appointments -->
    <div v-if="activeTab === 'appointments'">
      <DataTable :columns="apptColumns" :items="patientAppointments" empty-title="No appointments">
        <template #cell-status="{ item }"><StatusBadge :status="item.status" /></template>
        <template #cell-date="{ item }">{{ formatDate(item.date) }}</template>
      </DataTable>
    </div>

    <!-- Treatments -->
    <div v-if="activeTab === 'treatments'">
      <DataTable :columns="treatmentColumns" :items="treatments.treatments" empty-title="No treatments">
        <template #cell-status="{ item }"><StatusBadge :status="item.status" /></template>
        <template #cell-cost="{ item }">{{ formatCurrency(item.cost) }}</template>
      </DataTable>
    </div>

    <!-- Odontogram -->
    <div v-if="activeTab === 'odontogram'" class="card p-6">
      <DentalChart :teeth="odontogram.teeth" />
    </div>

    <!-- X-Rays -->
    <div v-if="activeTab === 'xrays'">
      <div v-if="xrays.xrays.length" class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div v-for="xray in xrays.xrays" :key="xray.id" class="card p-3">
          <XrayImage
            :xray="xray"
            :src="xrays.getImageUrl(xray)"
            :missing="xrays.isImageMissing(xray)"
            :alt="xray.xrayType"
            container-class="h-32 rounded-lg mb-2"
          />
          <p class="text-sm font-medium capitalize">{{ xray.xrayType }}</p>
          <p class="text-xs text-slate-500">{{ formatDate(xray.uploadDate) }}</p>
        </div>
      </div>
      <EmptyState v-else title="No X-ray records" description="Uploaded scans will appear here." :icon="ScanLine" />
    </div>

    <!-- Billing -->
    <div v-if="activeTab === 'billing'">
      <DataTable :columns="billingColumns" :items="billing.billings" empty-title="No billing records">
        <template #cell-paymentStatus="{ item }"><StatusBadge :status="item.paymentStatus" /></template>
        <template #cell-totalAmount="{ item }">{{ formatCurrency(item.totalAmount) }}</template>
        <template #cell-actions="{ item }">
          <router-link :to="`/billing/${item.id}`" class="text-primary-600 hover:underline text-xs">View</router-link>
        </template>
      </DataTable>
    </div>
  </div>
  <LoadingSpinner v-else :show="true" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ScanLine } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { usePatientsStore } from '@/stores/patients'
import { useAppointmentsStore } from '@/stores/appointments'
import { useTreatmentsStore } from '@/stores/treatments'
import { useOdontogramStore } from '@/stores/odontogram'
import { useXraysStore } from '@/stores/xrays'
import { useBillingStore } from '@/stores/billing'
import { usePageStore } from '@/stores/page'
import { fullName, formatDate, formatCurrency } from '@/utils/helpers'
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import XrayImage from '@/components/xrays/XrayImage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import DentalChart from '@/components/odontogram/DentalChart.vue'

const route = useRoute()
const patients = usePatientsStore()
const appointments = useAppointmentsStore()
const treatments = useTreatmentsStore()
const odontogram = useOdontogramStore()
const xrays = useXraysStore()
const billing = useBillingStore()
const pageStore = usePageStore()

const activeTab = ref('info')
const patient = ref(null)

const tabs = [
  { id: 'info', label: 'Personal Info' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'treatments', label: 'Treatments' },
  { id: 'odontogram', label: 'Odontogram' },
  { id: 'xrays', label: 'X-Rays' },
  { id: 'billing', label: 'Billing' },
]

const apptColumns = [
  { key: 'appointmentId', label: 'ID' },
  { key: 'serviceType', label: 'Service' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'status', label: 'Status' },
]

const treatmentColumns = [
  { key: 'procedureName', label: 'Procedure' },
  { key: 'toothNumber', label: 'Tooth' },
  { key: 'cost', label: 'Cost' },
  { key: 'status', label: 'Status' },
]

const billingColumns = [
  { key: 'invoiceNumber', label: 'Invoice #' },
  { key: 'totalAmount', label: 'Total' },
  { key: 'paymentStatus', label: 'Status' },
  { key: 'actions', label: 'Actions' },
]

const patientAppointments = computed(() =>
  appointments.getByPatient(route.params.id),
)

onMounted(async () => {
  const patientId = route.params.id
  patient.value = await patients.getPatient(patientId)
  if (patient.value && route.params.id === patientId) {
    pageStore.setHeader({
      title: fullName(patient.value),
      subtitle: patient.value.email || patient.value.contactNumber || '',
      forRoute: route.path,
    })
  }
  if (route.params.id !== patientId) return
  await appointments.fetchAppointments()
  await treatments.fetchByPatient(patientId)
  await odontogram.loadOdontogram(patientId)
  await xrays.fetchByPatient(patientId)
  await billing.fetchByPatient(patientId)
})

onUnmounted(() => {
  pageStore.clearHeader()
})
</script>
