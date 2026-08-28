<template>
  <div class="page-scroll-layout">
    <div class="page-header shrink-0">
      <button class="btn-primary sm:ml-auto" @click="showModal = true">+ Create Staff Account</button>
    </div>

    <DataTable
      class="page-scroll-table"
      scrollable
      :columns="columns"
      :items="users.users"
      :loading="users.loading"
    >
      <template #cell-role="{ item }">
        <span class="capitalize">{{ item.role?.replace('_', ' ') }}</span>
      </template>
      <template #cell-active="{ item }">
        <StatusBadge :status="item.active ? 'active' : 'inactive'" :label="item.active ? 'Active' : 'Inactive'" />
      </template>
      <template #cell-actions="{ item }">
        <button
          class="text-xs hover:underline"
          :class="item.active ? 'text-red-600' : 'text-teal-600'"
          @click="toggleActive(item)"
        >
          {{ item.active ? 'Deactivate' : 'Activate' }}
        </button>
      </template>
    </DataTable>

    <BaseModal :show="showModal" title="Create Staff Account" @close="showModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div>
          <label class="label">Full Name *</label>
          <input v-model="form.displayName" class="input" required />
        </div>
        <div>
          <label class="label">Email *</label>
          <input v-model="form.email" type="email" class="input" required />
        </div>
        <div>
          <label class="label">Password *</label>
          <input v-model="form.password" type="password" class="input" required minlength="6" />
        </div>
        <div>
          <label class="label">Role *</label>
          <select v-model="form.role" class="input" required>
            <option :value="ROLES.DENTIST">Dentist</option>
            <option :value="ROLES.ASSISTANT">Receptionist</option>
          </select>
        </div>
        <div>
          <label class="label">Phone</label>
          <input v-model="form.phone" class="input" />
        </div>
        <button type="submit" class="btn-primary w-full" :disabled="creating">
          {{ creating ? 'Creating...' : 'Create Account' }}
        </button>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { ROLES } from '@/constants'
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const users = useUsersStore()
const auth = useAuthStore()
const toast = useToastStore()

const showModal = ref(false)
const creating = ref(false)

const columns = [
  { key: 'displayName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'phone', label: 'Phone' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Actions' },
]

const form = ref({
  displayName: '', email: '', password: '', role: ROLES.DENTIST, phone: '',
})

onMounted(() => users.fetchUsers())

async function handleCreate() {
  creating.value = true
  try {
    await auth.createStaffAccount(form.value)
    await users.fetchUsers()
    toast.success('Staff account created.')
    showModal.value = false
    form.value = { displayName: '', email: '', password: '', role: ROLES.DENTIST, phone: '' }
  } catch (e) {
    toast.error(e.message)
  } finally {
    creating.value = false
  }
}

async function toggleActive(user) {
  const action = user.active ? 'deactivate' : 'activate'
  if (!confirm(`${action} ${user.displayName}?`)) return
  await users.toggleActive(user.id, !user.active)
  toast.success(`User ${action}d.`)
}
</script>
