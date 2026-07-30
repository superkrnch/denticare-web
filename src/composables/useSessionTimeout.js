import { watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { SESSION_IDLE_TIMEOUT_MS } from '@/constants'
import { getLastActivity, setLastActivity } from '@/utils/sessionActivity'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
const CHECK_INTERVAL_MS = 30_000
const ACTIVITY_THROTTLE_MS = 10_000

/** Passive screens (e.g. the TV queue display) never drive the idle logout. */
function isKioskRoute(router) {
  return router.currentRoute.value?.meta?.kiosk === true
}

export function useSessionTimeout() {
  const auth = useAuthStore()
  const router = useRouter()
  const { isAuthenticated } = storeToRefs(auth)

  let checkInterval = null
  let lastActivity = Date.now()
  let lastRecordedActivity = 0
  let loggingOut = false

  function recordActivity() {
    const now = Date.now()
    if (now - lastRecordedActivity < ACTIVITY_THROTTLE_MS) return
    lastRecordedActivity = now
    lastActivity = now
    setLastActivity(now)
  }

  async function handleTimeout() {
    if (loggingOut || !auth.isAuthenticated) return
    loggingOut = true
    stop()
    try {
      await auth.logout()
      await router.replace({ name: 'login', query: { reason: 'timeout' } })
    } finally {
      loggingOut = false
    }
  }

  function start() {
    stop()
    // The TV/queue display is a passive kiosk tab: it must stay signed in and
    // must never sign the shared session out on its own.
    if (isKioskRoute(router)) return

    lastActivity = Date.now()
    lastRecordedActivity = 0
    loggingOut = false
    setLastActivity(lastActivity)

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true })
    }

    checkInterval = setInterval(() => {
      // Use the shared timestamp so activity in any staff tab keeps the
      // session alive across all open tabs.
      const last = getLastActivity() ?? lastActivity
      if (Date.now() - last >= SESSION_IDLE_TIMEOUT_MS) {
        handleTimeout()
      }
    }, CHECK_INTERVAL_MS)
  }

  function stop() {
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, recordActivity)
    }
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
  }

  watch(
    isAuthenticated,
    (authed) => {
      if (authed) start()
      else stop()
    },
    { immediate: true },
  )

  onUnmounted(stop)
}
