<template>
  <div>
    <div class="mb-4">
      <label class="label">Select Patient</label>
      <select v-model="selectedPatientId" class="input max-w-md" @change="loadChart">
        <option value="">Choose a patient...</option>
        <option v-for="p in patientList" :key="p.id" :value="p.id">{{ fullName(p) }}</option>
      </select>
    </div>

    <div v-if="selectedPatientId" class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 card p-6">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="section-title">Dental chart</h3>
            <div class="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
              <button
                v-for="opt in modeOptions"
                :key="opt.value"
                type="button"
                class="rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors"
                :class="editMode === opt.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'"
                @click="setEditMode(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
            <button
              v-for="opt in dentitionOptions"
              :key="opt.value"
              type="button"
              class="rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors"
              :class="dentition === opt.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'"
              @click="setDentition(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <div class="min-w-max px-2">
            <DentalChart
              :teeth="odontogram.teeth"
              :selected="batchMode ? selectedTeeth : selectedTooth"
              :mode="dentition"
              @select="selectTooth"
            />
          </div>
        </div>
        <p v-if="batchMode" class="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Click teeth to select multiple, then apply a status to all of them at once.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2.5 border-t border-slate-200/70 pt-5 dark:border-slate-800">
          <span
            v-for="(label, key) in statusLabels"
            :key="key"
            class="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <span class="h-3 w-3 shrink-0 rounded-full" :class="dotColors[key]" />
            {{ label }}
          </span>
        </div>
      </div>

      <div v-if="batchMode" class="card p-6">
        <div class="mb-4 flex items-center justify-between gap-2">
          <h3 class="font-semibold">
            Batch edit
            <span class="text-slate-400">· {{ selectedTeeth.length }} selected</span>
          </h3>
          <div class="flex items-center gap-2">
            <button type="button" class="btn-secondary px-2.5 py-1 text-xs" @click="selectAllTeeth">All</button>
            <button
              type="button"
              class="btn-secondary px-2.5 py-1 text-xs"
              :disabled="!selectedTeeth.length"
              @click="clearSelection"
            >
              Clear
            </button>
          </div>
        </div>

        <div
          v-if="selectedTeeth.length"
          class="mb-4 flex flex-wrap gap-1.5"
        >
          <span
            v-for="num in sortedSelectedTeeth"
            :key="num"
            class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            #{{ num }}
            <button type="button" class="text-slate-400 hover:text-red-500" @click="toggleTooth(num)">
              <X class="h-3 w-3" :stroke-width="2.5" />
            </button>
          </span>
        </div>

        <form class="space-y-4" @submit.prevent="applyBatch">
          <div>
            <label class="label">Status</label>
            <select v-model="batchForm.status" class="input">
              <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div>
            <label class="label">Treatment</label>
            <input v-model="batchForm.treatment" class="input" />
          </div>
          <div>
            <label class="label">Clinical Notes</label>
            <textarea v-model="batchForm.notes" class="input" rows="3" />
          </div>
          <button type="submit" class="btn-primary w-full" :disabled="saving || !selectedTeeth.length">
            {{ saving ? 'Saving...' : `Apply to ${selectedTeeth.length} ${selectedTeeth.length === 1 ? 'tooth' : 'teeth'}` }}
          </button>
        </form>
      </div>

      <div v-else class="card p-6">
        <h3 class="font-semibold mb-4">
          {{ selectedTooth ? `Tooth #${selectedTooth}` : 'Select a tooth' }}
        </h3>
        <form v-if="selectedTooth" class="space-y-4" @submit.prevent="saveTooth">
          <div>
            <label class="label">Status</label>
            <select v-model="toothForm.status" class="input">
              <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div>
            <label class="label">Treatment</label>
            <input v-model="toothForm.treatment" class="input" />
          </div>
          <div>
            <label class="label">Clinical Notes</label>
            <textarea v-model="toothForm.notes" class="input" rows="3" />
          </div>
          <button type="submit" class="btn-primary w-full" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save Tooth Record' }}
          </button>
        </form>

        <div v-if="toothHistory.length" class="mt-6">
          <h4 class="text-sm font-semibold text-slate-700 mb-2">Tooth History</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div v-for="h in toothHistory" :key="h.id" class="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/60">
              <StatusBadge :status="h.status" />
              <p class="mt-1 text-slate-600">{{ h.notes || h.treatment || '—' }}</p>
              <p class="text-slate-400">{{ h.dentistName }} · {{ formatDate(h.dateUpdated) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      title="Select a patient"
      description="Choose a patient to view and edit their dental chart."
      :icon="Smile"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Smile, X } from '@lucide/vue'
import { usePatientsStore } from '@/stores/patients'
import { useOdontogramStore } from '@/stores/odontogram'
import { useToastStore } from '@/stores/toast'
import {
  TOOTH_STATUS_LABELS,
  TOOTH_STATUS_COLORS,
  TOOTH_STATUS_DOT_COLORS,
  TOOTH_NUMBERS,
  TOOTH_NUMBERS_CHILD,
} from '@/constants'
import { fullName, formatDate } from '@/utils/helpers'
import DentalChart from '@/components/odontogram/DentalChart.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const patients = usePatientsStore()
const odontogram = useOdontogramStore()
const toast = useToastStore()

const selectedPatientId = ref('')
const selectedTooth = ref(null)
const selectedTeeth = ref([])
const saving = ref(false)
const toothForm = ref({ status: 'healthy', treatment: '', notes: '' })
const batchForm = ref({ status: 'healthy', treatment: '', notes: '' })
const dentition = ref('adult')
const editMode = ref('single')

const dentitionOptions = [
  { value: 'adult', label: 'Adult' },
  { value: 'child', label: 'Child' },
]

const modeOptions = [
  { value: 'single', label: 'Single' },
  { value: 'batch', label: 'Batch' },
]

const batchMode = computed(() => editMode.value === 'batch')
const sortedSelectedTeeth = computed(() =>
  [...selectedTeeth.value].sort((a, b) => a - b),
)

const statusLabels = TOOTH_STATUS_LABELS
const statusColors = TOOTH_STATUS_COLORS
const dotColors = TOOTH_STATUS_DOT_COLORS
const patientList = computed(() => patients.patients.filter((p) => !p.archived))

const toothHistory = computed(() =>
  selectedTooth.value
    ? odontogram.history.filter((h) => h.toothNumber === selectedTooth.value)
    : [],
)

onMounted(() => patients.fetchPatients())

async function loadChart() {
  selectedTooth.value = null
  selectedTeeth.value = []
  if (selectedPatientId.value) {
    const patient = patientList.value.find((p) => p.id === selectedPatientId.value)
    // Sensible default: children (≤12) start on the primary-teeth chart.
    dentition.value = typeof patient?.age === 'number' && patient.age <= 12 ? 'child' : 'adult'
    await odontogram.loadOdontogram(selectedPatientId.value)
  }
}

function setDentition(value) {
  if (dentition.value === value) return
  dentition.value = value
  selectedTooth.value = null
  selectedTeeth.value = []
}

function setEditMode(value) {
  if (editMode.value === value) return
  editMode.value = value
  selectedTooth.value = null
  selectedTeeth.value = []
}

function selectTooth(num) {
  if (batchMode.value) {
    toggleTooth(num)
    return
  }
  selectedTooth.value = num
  const tooth = odontogram.teeth[num] || {}
  toothForm.value = {
    status: tooth.status || 'healthy',
    treatment: tooth.treatment || '',
    notes: tooth.notes || '',
  }
}

function toggleTooth(num) {
  const n = Number(num)
  const idx = selectedTeeth.value.indexOf(n)
  if (idx === -1) selectedTeeth.value = [...selectedTeeth.value, n]
  else selectedTeeth.value = selectedTeeth.value.filter((t) => t !== n)
}

function selectAllTeeth() {
  const nums = dentition.value === 'child' ? TOOTH_NUMBERS_CHILD : TOOTH_NUMBERS
  selectedTeeth.value = [...nums]
}

function clearSelection() {
  selectedTeeth.value = []
}

async function saveTooth() {
  saving.value = true
  try {
    await odontogram.updateTooth(selectedPatientId.value, selectedTooth.value, toothForm.value)
    toast.success(`Tooth #${selectedTooth.value} updated.`)
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}

async function applyBatch() {
  if (!selectedTeeth.value.length) return
  saving.value = true
  try {
    const count = selectedTeeth.value.length
    await odontogram.updateTeeth(selectedPatientId.value, selectedTeeth.value, batchForm.value)
    toast.success(`Updated ${count} ${count === 1 ? 'tooth' : 'teeth'}.`)
    selectedTeeth.value = []
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}
</script>
