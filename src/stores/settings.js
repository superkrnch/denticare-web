import { defineStore } from 'pinia'
import { ref } from 'vue'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, DEFAULT_TREATMENT_TEMPLATES } from '@/constants'
import { getDefaultAvailability, normalizeAvailability } from '@/utils/availability'

const CLINIC_DOC = 'clinic'
const TREATMENT_TEMPLATES_DOC = 'treatment_templates'

function normalizeTemplates(items) {
  if (!Array.isArray(items) || !items.length) return [...DEFAULT_TREATMENT_TEMPLATES]
  return items.map((item) => ({
    id: item.id || item.name?.toLowerCase().replace(/\s+/g, '_') || 'template',
    name: item.name || 'Procedure',
    defaultCost: Number(item.defaultCost) || 0,
    defaultNotes: item.defaultNotes || '',
  }))
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({
    clinicName: 'DentiCare Dental Clinic',
    address: '',
    phone: '',
    email: '',
  })
  const treatmentTemplates = ref([...DEFAULT_TREATMENT_TEMPLATES])
  const availability = ref(getDefaultAvailability())
  const loading = ref(false)
  const saving = ref(false)

  async function loadClinicSettings() {
    loading.value = true
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, CLINIC_DOC))
      if (snap.exists()) {
        settings.value = { ...settings.value, ...snap.data() }
      }
    } finally {
      loading.value = false
    }
  }

  async function loadDentistAvailability(userId) {
    loading.value = true
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId))
      availability.value = normalizeAvailability(snap.exists() ? snap.data().availability : null)
      return availability.value
    } finally {
      loading.value = false
    }
  }

  async function saveDentistAvailability(userId, data) {
    saving.value = true
    try {
      const nextAvailability = normalizeAvailability(data)
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        availability: nextAvailability,
        updatedAt: serverTimestamp(),
      })
      availability.value = nextAvailability
      return nextAvailability
    } finally {
      saving.value = false
    }
  }

  async function loadTreatmentTemplates() {
    loading.value = true
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, TREATMENT_TEMPLATES_DOC))
      if (snap.exists() && Array.isArray(snap.data().items)) {
        treatmentTemplates.value = normalizeTemplates(snap.data().items)
      } else {
        treatmentTemplates.value = [...DEFAULT_TREATMENT_TEMPLATES]
      }
      return treatmentTemplates.value
    } finally {
      loading.value = false
    }
  }

  async function saveTreatmentTemplates(items) {
    saving.value = true
    try {
      const normalized = normalizeTemplates(items)
      await setDoc(doc(db, COLLECTIONS.SETTINGS, TREATMENT_TEMPLATES_DOC), {
        items: normalized,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      treatmentTemplates.value = normalized
      return normalized
    } finally {
      saving.value = false
    }
  }

  return {
    settings,
    treatmentTemplates,
    availability,
    loading,
    saving,
    loadClinicSettings,
    loadDentistAvailability,
    saveDentistAvailability,
    loadTreatmentTemplates,
    saveTreatmentTemplates,
    // Backwards-compatible alias used by billing
    loadSettings: loadClinicSettings,
  }
})
