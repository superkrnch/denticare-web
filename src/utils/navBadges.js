export function formatNavBadge(count) {
  if (count > 99) return '99+'
  return String(count)
}

export function navBadgeCount(path, { patientMessages, appointments, queue }) {
  switch (path) {
    case '/patient-messages':
      return patientMessages.totalUnread
    case '/appointments':
      return appointments.pendingCount
    case '/queue':
      return queue.waitingCount
    default:
      return 0
  }
}

export function navBadgeLabel(path, count) {
  switch (path) {
    case '/patient-messages':
      return `${count} unread message${count === 1 ? '' : 's'}`
    case '/appointments':
      return `${count} pending appointment${count === 1 ? '' : 's'}`
    case '/queue':
      return `${count} patient${count === 1 ? '' : 's'} waiting`
    default:
      return `${count} notification${count === 1 ? '' : 's'}`
  }
}

export function navBadgeClass(path) {
  switch (path) {
    case '/appointments':
      return 'bg-amber-500 ring-white dark:ring-slate-900'
    case '/queue':
      return 'bg-primary-600 ring-white dark:ring-slate-900'
    default:
      return 'bg-red-500 ring-white dark:ring-slate-900'
  }
}
