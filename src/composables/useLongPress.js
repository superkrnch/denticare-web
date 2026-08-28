import { onUnmounted } from 'vue'

export function useLongPress(callback, delay = 500) {
  let timer = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function start(event, ...args) {
    if (event.button !== undefined && event.button !== 0) return
    clearTimer()
    timer = setTimeout(() => {
      timer = null
      callback(...args)
    }, delay)
  }

  function onPointerDown(event, ...args) {
    start(event, ...args)
  }

  function onContextMenu(event, ...args) {
    event.preventDefault()
    clearTimer()
    callback(...args)
  }

  onUnmounted(clearTimer)

  return {
    onPointerDown,
    onPointerUp: clearTimer,
    onPointerLeave: clearTimer,
    onPointerCancel: clearTimer,
    onContextMenu,
  }
}
