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

const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')

// Notify staff topic when a new appointment is created (useful for web clients subscribed to 'staff')
exports.onAppointmentCreatedNotifyStaff = onDocumentCreated(
  { document: 'appointments/{appointmentId}', ...functionOptions },
  async (event) => {
    const data = event.data?.data()
    if (!data) return

    const title = 'New appointment'
    const body = `${data.patientName || 'Patient'} — ${data.serviceType || 'Visit'} on ${data.date || ''} ${data.time || ''}`

    const message = {
      notification: { title, body },
      data: { type: 'appointment_created', appointmentId: event.params.appointmentId || '' },
      topic: 'staff',
    }

    try {
      await admin.messaging().send(message)
    } catch (err) {
      console.error('Failed sending staff notification', err)
    }
  },
)
