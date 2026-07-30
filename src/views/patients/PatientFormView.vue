<template>
  <div class="max-w-3xl">
    <div class="card p-6">
      <form class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
        <div>
          <label class="label">First Name *</label>
          <input v-model="form.firstName" class="input" required />
        </div>
        <div>
          <label class="label">Middle Name</label>
          <input v-model="form.middleName" class="input" />
        </div>
        <div>
          <label class="label">Last Name *</label>
          <input v-model="form.lastName" class="input" required />
        </div>
        <div>
          <label class="label">Birthdate *</label>
          <input v-model="form.birthdate" type="date" class="input" required />
        </div>
        <div>
          <label class="label">Sex *</label>
          <select v-model="form.sex" class="input" required>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label class="label">Contact Number *</label>
          <input v-model="form.contactNumber" class="input" required />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Address</label>
          <input v-model="form.address" class="input" />
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="form.email" type="email" class="input" />
        </div>
        <div>
          <label class="label">Emergency Contact</label>
          <input v-model="form.emergencyContact" class="input" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Medical Conditions</label>
          <textarea v-model="form.medicalConditions" class="input" rows="2" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Allergies</label>
          <textarea v-model="form.allergies" class="input" rows="2" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Current Medications</label>
          <textarea v-model="form.currentMedications" class="input" rows="2" />
        </div>
        <div class="sm:col-span-2 flex gap-3">
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : isEdit ? 'Update Patient' : 'Add Patient' }}
          </button>
          <router-link to="/patients" class="btn-secondary">Cancel</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePatientsStore } from '@/stores/patients'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const patients = usePatientsStore()
const toast = useToastStore()

const isEdit = computed(() => !!route.params.id && route.name === 'patient-edit')
const saving = ref(false)

const defaultForm = () => ({
  firstName: '', middleName: '', lastName: '', birthdate: '', sex: 'male',
  address: '', contactNumber: '', email: '', emergencyContact: '',
  medicalConditions: '', allergies: '', currentMedications: '',
})

const form = ref(defaultForm())

onMounted(async () => {
  if (isEdit.value) {
    const patient = await patients.getPatient(route.params.id)
    if (patient) form.value = { ...defaultForm(), ...patient }
  }
})

async function handleSubmit() {
  saving.value = true
  try {
    if (isEdit.value) {
      await patients.updatePatient(route.params.id, form.value)
      toast.success('Patient updated.')
    } else {
      await patients.addPatient(form.value)
      toast.success('Patient added.')
    }
    router.push('/patients')
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}
</script>
