import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])
  let id = 0

  function show(message, type = 'success', duration = 4000) {
    const toastId = ++id
    toasts.value.push({ id: toastId, message, type })
    setTimeout(() => remove(toastId), duration)
  }

  function remove(toastId) {
    toasts.value = toasts.value.filter((t) => t.id !== toastId)
  }

  function success(message) { show(message, 'success') }
  function error(message) { show(message, 'error', 6000) }
  function info(message) { show(message, 'info') }
  function warning(message) { show(message, 'warning') }

  return { toasts, show, remove, success, error, info, warning }
})
