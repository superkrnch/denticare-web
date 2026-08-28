const { initializeApp } = require('firebase-admin/app')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { generateChatReply } = require('./lib/dentiCareAi')
const { getOrCreatePatientChatRoom } = require('./lib/patientChat')

const { appointmentPushContent, queuePushContent } = require('./lib/messages')
const { loadPatient, sendPushToPatient } = require('./lib/notify')

initializeApp()
const db = getFirestore()

const NOTIFY_APPOINTMENT_STATUSES = new Set(['approved', 'rejected', 'cancelled'])

const functionOptions = {
  region: 'asia-southeast1',
}

const CHAT_HISTORY_DAYS = 15
const CHAT_CLEANUP_BATCH_SIZE = 500

exports.chatWithDentiCareAI = onCall(functionOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to use DentiCare AI.')
  }

  try {
    const text = await generateChatReply(request.data?.message, request.data?.history)
    return { text }
  } catch (error) {
    console.error('DentiCare AI request failed:', error)
    throw new HttpsError('internal', 'DentiCare AI is unavailable right now.')
  }
})

exports.getOrCreatePatientChatRoom = onCall(functionOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to message the clinic.')
  }

  try {
    return await getOrCreatePatientChatRoom(db, request.auth.uid)
  } catch (error) {
    console.error('Patient chat room setup failed:', error)
    if (error.code === 'permission-denied') {
      throw new HttpsError('permission-denied', error.message)
    }
    if (error.code === 'failed-precondition') {
      throw new HttpsError('failed-precondition', error.message)
    }
    throw new HttpsError('internal', 'Could not open clinic chat right now.')
  }
})

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

// Keep AI chat storage bounded without relying on users opening the chat.
exports.deleteExpiredChatHistory = onSchedule(
  { schedule: 'every 24 hours', timeZone: 'Asia/Manila', ...functionOptions },
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - CHAT_HISTORY_DAYS * 24 * 60 * 60 * 1000)
    const sessions = await db.collection('chat_sessions').get()
    let deletedCount = 0

    for (const session of sessions.docs) {
      const messages = await session.ref
        .collection('messages')
        .where('timestamp', '<', cutoff)
        .limit(CHAT_CLEANUP_BATCH_SIZE)
        .get()

      if (messages.empty) continue

      const batch = db.batch()
      messages.docs.forEach((message) => batch.delete(message.ref))
      await batch.commit()
      deletedCount += messages.size
    }

    console.log(`Deleted ${deletedCount} AI chat messages older than ${CHAT_HISTORY_DAYS} days.`)
  },
)

const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')

// Notify staff topic when a new appointment is created (useful for web clients subscribed to 'staff')
exports.onPatientChatMessageCreated = onDocumentCreated(
  { document: 'chatRooms/{roomId}/messages/{messageId}', ...functionOptions },
  async (event) => {
    const message = event.data?.data()
    if (!message?.senderId || !message.text) return

    const roomSnap = await db.collection('chatRooms').doc(event.params.roomId).get()
    if (!roomSnap.exists) return

    const senderStaff = await db.collection('users').doc(message.senderId).get()
    if (!senderStaff.exists) return

    const participants = roomSnap.data().participants || []
    const patientUid = participants.find((id) => id !== message.senderId)
    if (!patientUid) return

    const accountSnap = await db.collection('patient_accounts').doc(patientUid).get()
    if (!accountSnap.exists || accountSnap.data()?.active !== true) return

    const patient = await loadPatient(accountSnap.data().patientId)
    const preview = String(message.text).trim().slice(0, 120)

    await sendPushToPatient(patient, {
      title: 'New clinic message',
      body: preview || 'You have a new message from the clinic.',
      type: 'message',
      screen: 'messages',
    })
  },
)

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
