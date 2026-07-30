<template>
  <div>
    <div class="page-header">
      <router-link to="/treatments/presets" class="btn-secondary sm:ml-auto">
        Manage presets
      </router-link>
      <button class="btn-primary" @click="openModal()">+ New Treatment Plan</button>
    </div>

    <div class="flex gap-3 mb-4">
      <select v-model="patientFilter" class="input max-w-xs">
        <option value="">All Patients</option>
        <option v-for="p in patientList" :key="p.id" :value="p.id">{{ fullName(p) }}</option>
      </select>
      <select v-model="statusFilter" class="input max-w-xs">
        <option value="">All Statuses</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <DataTable :columns="columns" :items="filtered" :loading="treatments.loading">
      <template #cell-patientName="{ item }">{{ item.patientName }}</template>
      <template #cell-cost="{ item }">{{ formatCurrency(item.cost) }}</template>
      <template #cell-status="{ item }"><StatusBadge :status="item.status" /></template>
      <template #cell-actions="{ item }">
        <div class="flex gap-2">
          <button class="text-primary-600 text-xs hover:underline" @click="openModal(item)">Edit</button>
          <button v-if="item.status !== 'completed'" class="text-teal-600 text-xs hover:underline" @click="markComplete(item.id)">Complete</button>
          <button class="text-red-600 text-xs hover:underline" @click="handleDelete(item.id)">Delete</button>
        </div>
      </template>
    </DataTable>

    <BaseModal :show="showModal" :title="editingId ? 'Edit Treatment' : 'New Treatment Plan'" @close="closeModal">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="label">Patient *</label>
          <select v-model="form.patientId" class="input" required @change="onPatientChange">
            <option value="">Select patient</option>
            <option v-for="p in patientList" :key="p.id" :value="p.id">{{ fullName(p) }}</option>
          </select>
        </div>
        <div>
          <label class="label">Procedure preset</label>
          <select v-model="selectedTemplateId" class="input" @change="applyTemplate">
            <option value="">Choose a preset (optional)</option>
            <option v-for="t in presets" :key="t.id" :value="t.id">{{ t.name }} — {{ formatCurrency(t.defaultCost) }}</option>
          </select>
        </div>
        <div>
          <label class="label">Procedure *</label>
          <input v-model="form.procedureName" class="input" required />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Tooth Number</label>
            <input v-model.number="form.toothNumber" type="number" class="input" min="11" max="48" />
          </div>
          <div>
            <label class="label">Cost (PHP) *</label>
            <input v-model.number="form.cost" type="number" class="input" required min="0" step="0.01" />
          </div>
        </div>
        <div>
          <label class="label">Status</label>
          <select v-model="form.status" class="input">
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label class="label">Notes</label>
          <textarea v-model="form.notes" class="input" rows="2" />
        </div>
        <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTreatmentsStore } from '@/stores/treatments'
import { usePatientsStore } from '@/stores/patients'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import { TREATMENT_STATUS } from '@/constants'
import { fullName, formatCurrency } from '@/utils/helpers'
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const treatments = useTreatmentsStore()
const patients = usePatientsStore()
const settings = useSettingsStore()
const toast = useToastStore()

const patientFilter = ref('')
const statusFilter = ref('')
const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)
const selectedTemplateId = ref('')
const statuses = Object.values(TREATMENT_STATUS)

const presets = computed(() => settings.treatmentTemplates)

const columns = [
  { key: 'patientName', label: 'Patient' },
  { key: 'procedureName', label: 'Procedure' },
  { key: 'toothNumber', label: 'Tooth' },
  { key: 'cost', label: 'Cost' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
]

const defaultForm = () => ({
  patientId: '', patientName: '', procedureName: 'Cleaning',
  toothNumber: null, cost: 0, status: 'planned', notes: '',
})
const form = ref(defaultForm())

const patientList = computed(() => patients.patients.filter((p) => !p.archived))

const filtered = computed(() => {
  let list = treatments.treatments
  if (patientFilter.value) list = list.filter((t) => t.patientId === patientFilter.value)
  if (statusFilter.value) list = list.filter((t) => t.status === statusFilter.value)
  return list
})

onMounted(async () => {
  await Promise.all([
    treatments.fetchAll(),
    patients.fetchPatients(),
    settings.loadTreatmentTemplates(),
  ])
})

function onPatientChange() {
  const p = patientList.value.find((x) => x.id === form.value.patientId)
  form.value.patientName = p ? fullName(p) : ''
}

function applyTemplate() {
  const template = presets.value.find((t) => t.id === selectedTemplateId.value)
  if (!template) return
  form.value.procedureName = template.name
  form.value.cost = template.defaultCost
  form.value.notes = template.defaultNotes || ''
}

function openModal(item = null) {
  selectedTemplateId.value = ''
  if (item) {
    editingId.value = item.id
    form.value = { ...item }
  } else {
    editingId.value = null
    const first = presets.value[0]
    form.value = defaultForm()
    if (first) {
      form.value.procedureName = first.name
      form.value.cost = first.defaultCost
      form.value.notes = first.defaultNotes || ''
      selectedTemplateId.value = first.id
    }
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function handleSubmit() {
  saving.value = true
  try {
    if (editingId.value) {
      await treatments.updateTreatment(editingId.value, form.value)
      toast.success('Treatment updated.')
    } else {
      await treatments.createTreatment(form.value)
      toast.success('Treatment plan created.')
    }
    await treatments.fetchAll()
    closeModal()
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}

async function markComplete(id) {
  await treatments.markComplete(id)
  await treatments.fetchAll()
  toast.success('Treatment marked complete.')
}

async function handleDelete(id) {
  if (!confirm('Delete this treatment plan?')) return
  await treatments.deleteTreatment(id)
  toast.success('Treatment deleted.')
}
</script>
