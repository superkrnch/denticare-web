<template>
  <div class="page-scroll-layout">
    <div class="page-header shrink-0">
      <router-link to="/patients/new" class="btn-primary sm:ml-auto">+ Add Patient</router-link>
    </div>

    <div class="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row">
      <div class="flex-1">
        <SearchBar v-model="search" placeholder="Search by name, email, or phone..." />
      </div>
      <select v-model="sexFilter" class="input w-full sm:w-40">
        <option value="">All Sex</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
    </div>

    <DataTable
      class="page-scroll-table"
      scrollable
      :columns="columns"
      :items="filtered"
      :loading="patients.loading"
    >
      <template #cell-name="{ item }">
        {{ fullName(item) }}
      </template>
      <template #cell-sex="{ item }">
        <span class="capitalize">{{ item.sex }}</span>
      </template>
      <template #cell-actions="{ item }">
        <div class="flex gap-2">
          <router-link :to="`/patients/${item.id}`" class="text-primary-600 hover:underline text-xs">View</router-link>
          <router-link :to="`/patients/${item.id}/edit`" class="text-teal-600 hover:underline text-xs">Edit</router-link>
          <button class="text-red-600 hover:underline text-xs" @click="confirmArchive(item)">Archive</button>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePatientsStore } from '@/stores/patients'
import { useToastStore } from '@/stores/toast'
import { fullName } from '@/utils/helpers'
import SearchBar from '@/components/common/SearchBar.vue'
import DataTable from '@/components/common/DataTable.vue'

const patients = usePatientsStore()
const toast = useToastStore()
const search = ref('')
const sexFilter = ref('')

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'contactNumber', label: 'Contact' },
  { key: 'email', label: 'Email' },
  { key: 'age', label: 'Age' },
  { key: 'sex', label: 'Sex' },
  { key: 'actions', label: 'Actions' },
]

const filtered = computed(() =>
  patients.searchPatients(search.value, { sex: sexFilter.value || undefined }),
)

onMounted(() => patients.fetchPatients())

async function confirmArchive(patient) {
  if (!confirm(`Archive ${fullName(patient)}?`)) return
  await patients.archivePatient(patient.id)
  await patients.fetchPatients()
  toast.success('Patient archived.')
}
</script>
