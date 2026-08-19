import { onMounted, onBeforeUnmount } from 'vue'

export function useClickAway(targetRef, handler) {
  function onClick(e) {
    const el = targetRef.value
    if (!el) return
    if (!el.contains(e.target)) handler(e)
  }

  onMounted(() => document.addEventListener('click', onClick))
  onBeforeUnmount(() => document.removeEventListener('click', onClick))
}
