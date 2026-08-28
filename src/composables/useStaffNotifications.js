import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePatientMessagesStore } from '@/stores/patientMessages'
import { primeNotificationAudio } from '@/utils/notificationSound'

export function useStaffNotifications() {
  const route = useRoute()
  const patientMessages = usePatientMessagesStore()

  function primeAudio() {
    primeNotificationAudio()
    window.removeEventListener('pointerdown', primeAudio)
    window.removeEventListener('keydown', primeAudio)
  }

  watch(
    () => route.path,
    (path) => {
      patientMessages.setSuppressAlerts(path === '/patient-messages')
    },
    { immediate: true },
  )

  onMounted(() => {
    patientMessages.subscribe()
    window.addEventListener('pointerdown', primeAudio, { once: true })
    window.addEventListener('keydown', primeAudio, { once: true })
  })

  onUnmounted(() => {
    window.removeEventListener('pointerdown', primeAudio)
    window.removeEventListener('keydown', primeAudio)
    patientMessages.unsubscribeRooms()
  })
}
