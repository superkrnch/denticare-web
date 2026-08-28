const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

async function loadPatient(patientId) {
  if (!patientId) return null
  const snapshot = await getFirestore().collection('patients').doc(patientId).get()
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null
}

async function sendPushToPatient(patient, payload) {
  const tokens = Array.isArray(patient?.fcmTokens)
    ? [...new Set(patient.fcmTokens.filter((token) => typeof token === 'string' && token))]
    : []
  if (!tokens.length) return

  const data = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, String(value ?? '')]),
  )
  await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data,
  })
}

module.exports = { loadPatient, sendPushToPatient }
