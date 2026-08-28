import { defineStore } from 'pinia'
import { ref } from 'vue'
import { playNotificationSound } from '@/utils/notificationSound'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])
  let id = 0

  function show(message, type = 'success', duration = 4000, { sound = false } = {}) {
    if (sound) playNotificationSound()
    const toastId = ++id
    toasts.value.push({ id: toastId, message, type })
    setTimeout(() => remove(toastId), duration)
  }

  function remove(toastId) {
    toasts.value = toasts.value.filter((t) => t.id !== toastId)
  }

  function success(message) { show(message, 'success') }
  function error(message) { show(message, 'error', 6000) }
  function info(message, options = {}) { show(message, 'info', 4000, options) }
  function warning(message, options = {}) { show(message, 'warning', 5000, options) }

  /** Alert toast with notification sound — for incoming realtime events. */
  function notify(message, type = 'info', duration = 5000) {
    show(message, type, duration, { sound: true })
  }

  return { toasts, show, remove, success, error, info, warning, notify }
})
