import { computed } from 'vue'
import { formatDentistLabel } from '@/utils/helpers'

/** Single-doctor clinic: one dentist handles all patients. */
export function useClinicDentists(dentistListRef) {
  const dentist = computed(() => {
    const list = dentistListRef.value || []
    return list[0] || null
  })

  const dentistLabel = computed(() => formatDentistLabel(dentist.value?.displayName))

  function resolveDentist(dentistId, dentistName) {
    if (dentistId && dentistName) {
      return { dentistId, dentistName }
    }
    const d = dentist.value
    if (d) {
      return { dentistId: d.id, dentistName: d.displayName }
    }
    return { dentistId: '', dentistName: '' }
  }

  return { dentist, dentistLabel, resolveDentist }
}
