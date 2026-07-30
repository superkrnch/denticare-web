const { initializeApp } = require('firebase-admin/app')
const { onDocumentUpdated } = require('firebase-functions/v2/firestore')

const { appointmentPushContent, queuePushContent } = require('./lib/messages')
const { loadPatient, sendPushToPatient } = require('./lib/notify')

initializeApp()

const NOTIFY_APPOINTMENT_STATUSES = new Set(['approved', 'rejected', 'cancelled'])

const functionOptions = {
  region: 'asia-southeast1',
}

exports.onAppointmentStatusChanged = onDocumentUpdated(
  { document: 'appointments/{appointmentId}', ...functionOptions },
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()
    if (!before || !after) return

    const previousStatus = before.status
    const nextStatus = after.status
    if (previousStatus === nextStatus) return
    if (!NOTIFY_APPOINTMENT_STATUSES.has(nextStatus)) return

    const patient = await loadPatient(after.patientId)
    const push = appointmentPushContent(nextStatus, {
      serviceType: after.serviceType || 'Visit',
      date: after.date || '',
      time: after.time || '',
    })

    if (push) {
      await sendPushToPatient(patient, {
        ...push,
        type: 'appointment',
        status: nextStatus,
      })
    }
  },
)

exports.onQueueStatusChanged = onDocumentUpdated(
  { document: 'queues/{queueId}', ...functionOptions },
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()
    if (!before || !after) return

    const previousStatus = before.status
    const nextStatus = after.status
    if (previousStatus === nextStatus) return
    if (nextStatus !== 'serving') return
    if (after.notifyOnCall === false) return

    const patient = await loadPatient(after.patientId)
    const push = queuePushContent({ queueNumber: after.queueNumber })

    await sendPushToPatient(patient, {
      ...push,
      type: 'queue',
      status: nextStatus,
    })
  },
)
