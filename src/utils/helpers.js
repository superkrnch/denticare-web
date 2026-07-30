import { format } from 'date-fns'

/** Build a patient's full name from its parts. */
export function fullName(person) {
  if (!person) return ''
  return [person.firstName, person.middleName, person.lastName]
    .filter((part) => part && String(part).trim())
    .join(' ')
    .trim()
}

function toDate(value) {
  if (!value) return null
  if (value?.toDate) return value.toDate()
  if (value instanceof Date) return value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Format a date (Firestore Timestamp, ISO string, or Date) as "Jun 22, 2026". */
export function formatDate(value) {
  const d = toDate(value)
  return d ? format(d, 'MMM d, yyyy') : '—'
}

/** Format a date-time as "Jun 22, 2026 3:04 PM". */
export function formatDateTime(value) {
  const d = toDate(value)
  return d ? format(d, 'MMM d, yyyy h:mm a') : '—'
}

/** Format a number as Philippine Peso currency. */
export function formatCurrency(amount) {
  const value = Number(amount) || 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value)
}

/** Generate a short unique id with a prefix, e.g. "INV-mqp3ji1znivz". */
export function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Present a dentist's name with a "Dr." title (single-doctor clinic friendly). */
export function formatDentistLabel(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'Our Dentist'
  return /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`
}
