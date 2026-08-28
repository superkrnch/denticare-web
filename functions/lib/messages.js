function appointmentPushContent(status, { serviceType, date, time }) {
  const labels = {
    approved: ['Appointment approved', 'Your appointment has been approved.'],
    rejected: ['Appointment update', 'Your appointment request was not approved.'],
    cancelled: ['Appointment cancelled', 'Your appointment has been cancelled.'],
  }
  const [title, statusText] = labels[status] || ['Appointment update', 'Your appointment status changed.']
  return {
    title,
    body: `${statusText} ${serviceType || 'Visit'} — ${date || ''} ${time || ''}`.trim(),
  }
}

function queuePushContent({ queueNumber }) {
  return {
    title: 'Your turn is coming up',
    body: `Please prepare for queue number ${queueNumber || ''}.`.trim(),
  }
}

module.exports = { appointmentPushContent, queuePushContent }
