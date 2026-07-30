import { format, addDays, parseISO, isBefore, startOfDay } from 'date-fns'

export function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function tomorrowIso() {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

/** Patients: regular bookings must be after today; urgent = same day only. */
export function validatePatientBooking({ date, urgent, notes }) {
  const today = todayIso()
  if (!date) return 'Please choose a date.'

  if (urgent) {
    if (date !== today) {
      return 'Urgent visits can only be requested for today. Turn off urgent if you want a later date.'
    }
    if (!notes || notes.trim().length < 10) {
      return 'Please describe your urgent concern (at least 10 characters).'
    }
    return null
  }

  if (date <= today) {
    return 'Regular appointments must be booked at least one day ahead. Use urgent booking for same-day dental emergencies.'
  }
  return null
}

export function isUrgentAppointment(item) {
  return item?.urgent === true || item?.priority === 'urgent'
}
