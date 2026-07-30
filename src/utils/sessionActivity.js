import { SESSION_IDLE_TIMEOUT_MS } from '@/constants'

const LAST_ACTIVITY_KEY = 'denticare_last_activity'
const SESSION_EXPIRED_FLAG = 'denticare_session_expired'

export function getLastActivity() {
  const value = localStorage.getItem(LAST_ACTIVITY_KEY)
  return value ? Number(value) : null
}

export function setLastActivity(timestamp = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp))
}

export function clearLastActivity() {
  localStorage.removeItem(LAST_ACTIVITY_KEY)
}

export function isSessionExpired() {
  const lastActivity = getLastActivity()
  if (lastActivity === null) return true
  return Date.now() - lastActivity >= SESSION_IDLE_TIMEOUT_MS
}

export function flagSessionExpired() {
  sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1')
}

export function consumeSessionExpiredFlag() {
  const expired = sessionStorage.getItem(SESSION_EXPIRED_FLAG) === '1'
  if (expired) sessionStorage.removeItem(SESSION_EXPIRED_FLAG)
  return expired
}
