<template>
  <div>
    <div class="page-header">
      <button class="btn-primary sm:ml-auto" @click="openNew">+ New Appointment</button>
    </div>

    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <div class="flex-1"><SearchBar v-model="search" placeholder="Search appointments..." /></div>
      <select v-model="statusFilter" class="input w-full sm:w-44">
        <option value="">All Statuses</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <DataTable :columns="columns" :items="filtered" :loading="appointments.loading">
      <template #cell-patientName="{ item }">{{ item.patientName }}</template>
      <template #cell-date="{ item }">{{ formatDate(item.date) }}</template>
      <template #cell-status="{ item }">
        <div class="flex flex-wrap items-center gap-1">
          <StatusBadge :status="item.status" />
          <StatusBadge v-if="item.urgent" status="urgent" label="Urgent" />
        </div>
      </template>
      <template #cell-actions="{ item }">
        <div class="flex flex-wrap gap-2">
          <button v-if="canCheckIn(item)" class="text-violet-600 text-xs hover:underline" @click="checkIn(item)">Check in</button>
          <button v-if="item.status === 'pending'" class="text-teal-600 text-xs hover:underline" @click="updateStatus(item.id, 'approved')">Approve</button>
          <button v-if="item.status === 'pending'" class="text-red-600 text-xs hover:underline" @click="updateStatus(item.id, 'rejected')">Reject</button>
          <button v-if="item.status === 'approved'" class="text-primary-600 text-xs hover:underline" @click="updateStatus(item.id, 'completed')">Complete</button>
          <button v-if="!['cancelled','completed','rejected'].includes(item.status)" class="text-slate-600 text-xs hover:underline" @click="openEdit(item)">Edit</button>
          <button v-if="!['cancelled','completed'].includes(item.status)" class="text-red-600 text-xs hover:underline" @click="updateStatus(item.id, 'cancelled')">Cancel</button>
        </div>
      </template>
    </DataTable>

    <BaseModal :show="showModal" :title="editingId ? 'Edit Appointment' : 'New Appointment'" @close="closeModal">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="label">Patient *</label>
          <select v-model="form.patientId" class="input" required @change="onPatientChange">
            <option value="">Select patient</option>
            <option v-for="p in patientList" :key="p.id" :value="p.id">{{ fullName(p) }}</option>
          </select>
        </div>
        <div>
          <label class="label">Procedure *</label>
          <select v-model="form.serviceType" class="input" required @change="onServiceChange">
            <option v-for="t in procedureOptions" :key="t.id" :value="t.name">
              {{ t.name }} — {{ formatCurrency(t.defaultCost) }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Date *</label>
            <input v-model="form.date" type="date" class="input" required />
          </div>
          <div>
            <label class="label">Time *</label>
            <input v-model="form.time" type="time" class="input" required />
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input v-model="form.urgent" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-primary-600" />
          Urgent / same-day (priority queue when checked in)
        </label>
        <div>
          <label class="label">Notes</label>
          <textarea v-model="form.notes" class="input" rows="2" />
        </div>
        <div class="flex gap-3">
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
          <button type="button" class="btn-secondary" @click="closeModal">Cancel</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'
import { useAppointmentsStore } from '@/stores/appointments'
import { usePatientsStore } from '@/stores/patients'
import { useUsersStore } from '@/stores/users'
import { useQueueStore } from '@/stores/queue'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import { APPOINTMENT_STATUS } from '@/constants'
import { fullName, formatDate, formatCurrency } from '@/utils/helpers'
import { availabilityMessage } from '@/utils/availability'
import SearchBar from '@/components/common/SearchBar.vue'
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const appointments = useAppointmentsStore()
const patients = usePatientsStore()
const users = useUsersStore()
const queue = useQueueStore()
const settings = useSettingsStore()
const toast = useToastStore()

const search = ref('')
const statusFilter = ref('')
const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)
const dentistList = ref([])
const statuses = Object.values(APPOINTMENT_STATUS)
const procedureOptions = computed(() => settings.treatmentTemplates)

const columns = [
  { key: 'appointmentId', label: 'ID' },
  { key: 'patientName', label: 'Patient' },
  { key: 'serviceType', label: 'Service' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
]

const defaultForm = () => ({
  patientId: '', patientName: '', dentistId: '', dentistName: '',
  serviceType: '', procedureId: '', estimatedCost: 0,
  date: '', time: '', notes: '', status: 'pending', urgent: false,
})
const form = ref(defaultForm())

const patientList = computed(() => patients.patients.filter((p) => !p.archived))

const filtered = computed(() => {
  let list = appointments.appointments
  if (statusFilter.value) list = list.filter((a) => a.status === statusFilter.value)
  if (search.value) {
    const t = search.value.toLowerCase()
    list = list.filter((a) =>
      `${a.patientName} ${a.dentistName} ${a.appointmentId}`.toLowerCase().includes(t),
    )
  }
  return list
})

onMounted(async () => {
  await Promise.all([
    appointments.fetchAppointments(),
    patients.fetchPatients(),
    settings.loadClinicSettings(),
    settings.loadTreatmentTemplates(),
  ])
  dentistList.value = await users.getDentists()
})

function onServiceChange() {
  const template = procedureOptions.value.find((t) => t.name === form.value.serviceType)
  if (!template) return
  form.value.procedureId = template.id
  form.value.estimatedCost = template.defaultCost
}

function applyClinicDentist() {
  const d = dentistList.value[0]
  if (d) {
    form.value.dentistId = d.id
    form.value.dentistName = d.displayName
  }
}

function openNew() {
  editingId.value = null
  form.value = defaultForm()
  const first = procedureOptions.value[0]
  if (first) {
    form.value.serviceType = first.name
    form.value.procedureId = first.id
    form.value.estimatedCost = first.defaultCost
  }
  applyClinicDentist()
  showModal.value = true
}

function onPatientChange() {
  const p = patientList.value.find((x) => x.id === form.value.patientId)
  form.value.patientName = p ? fullName(p) : ''
}

function openEdit(item) {
  editingId.value = item.id
  form.value = { ...item }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  form.value = defaultForm()
}

async function handleSubmit() {
  saving.value = true
  try {
    applyClinicDentist()
    onServiceChange()
    const dentist = dentistList.value[0]
    const conflict = availabilityMessage(dentist?.availability, form.value.date, form.value.time)
    if (conflict) {
      toast.error(conflict)
      return
    }

    if (editingId.value) {
      await appointments.updateAppointment(editingId.value, form.value)
      toast.success('Appointment updated.')
    } else {
      await appointments.createAppointment(form.value)
      toast.success('Appointment created.')
    }
    await appointments.fetchAppointments()
    closeModal()
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}

async function updateStatus(id, status) {
  await appointments.updateStatus(id, status)
  await appointments.fetchAppointments()
  toast.success(`Appointment ${status}.`)
}

function canCheckIn(item) {
  const today = format(new Date(), 'yyyy-MM-dd')
  return item.status === 'approved' && item.date === today && !item.queueId
}

async function checkIn(item) {
  try {
    const patient = patients.patients.find((p) => p.id === item.patientId)
      || await patients.getPatient(item.patientId)
    const result = await queue.checkInFromAppointment(item, patient)
    await appointments.fetchAppointments()
    if (result.alreadyInQueue) {
      toast.info(`Already in queue as #${result.queueNumber}.`)
    } else {
      toast.success(`Checked in — queue #${result.queueNumber}.`)
    }
  } catch (e) {
    toast.error(e.message)
  }
}
</script>
