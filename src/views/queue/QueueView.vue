<template>
  <div class="page-scroll-layout">
    <div class="page-header shrink-0">
      <div class="flex flex-wrap gap-2 sm:ml-auto">
        <router-link to="/display/queue" target="_blank" class="btn-secondary">
          Open TV Display
        </router-link>
        <button class="btn-primary" @click="showAddModal = true">+ Add to Queue</button>
      </div>
    </div>

    <div v-if="dentist" class="card mb-6 shrink-0 p-4 sm:p-5">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dentist</p>
      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{{ dentistLabel }}</p>
    </div>

    <div class="mb-6 grid shrink-0 grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="card p-6 text-center bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <p class="text-sm opacity-80">Now Serving</p>
        <p class="text-5xl font-bold mt-2">{{ currentServing?.queueNumber ?? '—' }}</p>
        <p class="text-sm mt-2 opacity-80">{{ currentServing?.patientName || 'No patient' }}</p>
        <p v-if="currentServing?.urgent" class="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-200">Urgent</p>
      </div>
      <div class="card p-6">
        <p class="text-sm text-slate-500">Waiting</p>
        <p class="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-50">{{ waiting.length }}</p>
      </div>
      <div class="card p-6">
        <p class="text-sm text-slate-500">Est. Wait (next)</p>
        <p class="text-3xl font-bold text-teal-600 mt-1">
          {{ waiting.length ? queue.estimatedWait(waiting.length) + ' min' : '—' }}
        </p>
      </div>
    </div>

    <div class="mb-4 flex shrink-0 flex-wrap gap-3">
      <button class="btn-teal" :disabled="!waiting.length" @click="handleCallNext">
        Call Next Patient
      </button>
    </div>

    <DataTable
      class="page-scroll-table"
      scrollable
      :columns="columns"
      :items="queue.queueItems"
      empty-title="Queue is empty"
      empty-description="Add patients or check in from appointments."
    >
      <template #cell-status="{ item }">
        <div class="flex flex-wrap items-center gap-1">
          <StatusBadge :status="item.status" />
          <StatusBadge v-if="item.urgent" status="urgent" label="Urgent" />
        </div>
      </template>
      <template #cell-patientName="{ item }">
        <span>{{ item.patientName }}</span>
      </template>
      <template #cell-position="{ item }">
        {{ item.status === 'waiting' ? waiting.findIndex((q) => q.id === item.id) + 1 : '—' }}
      </template>
      <template #cell-estWait="{ item }">
        {{ item.status === 'waiting' ? queue.estimatedWait(waiting.findIndex((q) => q.id === item.id) + 1) + ' min' : '—' }}
      </template>
      <template #cell-actions="{ item }">
        <div class="flex flex-wrap gap-2">
          <button v-if="item.status === 'waiting'" class="text-primary-600 text-xs hover:underline" @click="queue.markServing(item.id)">Serve</button>
          <button v-if="item.status === 'serving'" class="text-teal-600 text-xs hover:underline" @click="queue.markCompleted(item.id)">Complete</button>
          <button v-if="item.status === 'waiting'" class="text-amber-600 text-xs hover:underline" @click="queue.skipPatient(item.id)">Skip</button>
        </div>
      </template>
    </DataTable>

    <BaseModal :show="showAddModal" title="Add to Queue" @close="showAddModal = false">
      <form class="space-y-4" @submit.prevent="handleAdd">
        <div>
          <label class="label">Patient *</label>
          <select v-model="selectedPatient" class="input" required>
            <option value="">Select patient</option>
            <option v-for="p in patientList" :key="p.id" :value="p.id">{{ fullName(p) }}</option>
          </select>
        </div>
        <button type="submit" class="btn-primary" :disabled="adding">{{ adding ? 'Adding...' : 'Generate Queue Number' }}</button>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQueueStore } from '@/stores/queue'
import { usePatientsStore } from '@/stores/patients'
import { useUsersStore } from '@/stores/users'
import { useToastStore } from '@/stores/toast'
import { useClinicDentists } from '@/composables/useClinicDentists'
import { fullName } from '@/utils/helpers'
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const queue = useQueueStore()
const patients = usePatientsStore()
const users = useUsersStore()
const toast = useToastStore()

const showAddModal = ref(false)
const selectedPatient = ref('')
const adding = ref(false)
const dentistList = ref([])

const { dentist, dentistLabel, resolveDentist } = useClinicDentists(dentistList)

const columns = [
  { key: 'queueNumber', label: 'Queue #' },
  { key: 'patientName', label: 'Patient' },
  { key: 'status', label: 'Status' },
  { key: 'position', label: 'Position' },
  { key: 'estWait', label: 'Est. Wait' },
  { key: 'actions', label: 'Actions' },
]

const patientList = computed(() => patients.patients.filter((p) => !p.archived))
const waiting = computed(() => queue.waitingList())
const currentServing = computed(() => queue.servingItem())

onMounted(async () => {
  await patients.fetchPatients()
  dentistList.value = await users.getDentists()
})

async function handleCallNext() {
  const next = await queue.callNext()
  if (next) toast.success(`Now serving #${next.queueNumber} — ${next.patientName}`)
  else toast.warning('No patients waiting.')
}

async function handleAdd() {
  adding.value = true
  try {
    const p = patientList.value.find((x) => x.id === selectedPatient.value)
    if (!p) return
    const { dentistId, dentistName } = resolveDentist(dentist.value?.id, dentist.value?.displayName)
    const result = await queue.generateQueueNumber(p.id, fullName(p), {
      dentistId,
      dentistName,
      patientPhone: p.contactNumber || '',
      patientEmail: p.email || '',
    })
    toast.success(`Queue #${result.queueNumber} generated.`)
    showAddModal.value = false
    selectedPatient.value = ''
  } catch (e) {
    toast.error(e.message)
  } finally {
    adding.value = false
  }
}
</script>
