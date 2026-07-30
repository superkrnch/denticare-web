export const WEEKDAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

export function getDefaultAvailability() {
  return {
    monday: { open: '08:00', close: '17:00', closed: false },
    tuesday: { open: '08:00', close: '17:00', closed: false },
    wednesday: { open: '08:00', close: '17:00', closed: false },
    thursday: { open: '08:00', close: '17:00', closed: false },
    friday: { open: '08:00', close: '17:00', closed: false },
    saturday: { open: '08:00', close: '12:00', closed: false },
    sunday: { open: '', close: '', closed: true },
  }
}

export function normalizeAvailability(availability) {
  return {
    ...getDefaultAvailability(),
    ...(availability || {}),
  }
}

function dayKeyFromDate(dateStr) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date(`${dateStr}T12:00:00`).getDay()]
}

export function isWithinAvailability(availability, date, time) {
  if (!availability || !date || !time) return true

  const day = availability[dayKeyFromDate(date)]
  if (!day || day.closed || !day.open || !day.close) return false

  return time >= day.open && time <= day.close
}

export function availabilityMessage(availability, date, time) {
  if (!availability || !date || !time) return null
  if (isWithinAvailability(availability, date, time)) return null

  const day = availability[dayKeyFromDate(date)]
  if (!day || day.closed) {
    return 'The selected dentist is not available on this day.'
  }

  return `The selected dentist is only available from ${day.open} to ${day.close} on this day.`
}
