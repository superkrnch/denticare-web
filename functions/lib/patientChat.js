const { FieldValue } = require('firebase-admin/firestore')

const STAFF_ROLES = ['administrator', 'dentist', 'dental_assistant']

async function findSupportStaffId(db, patientId) {
  const snapshot = await db
    .collection('users')
    .where('active', '==', true)
    .where('role', 'in', STAFF_ROLES)
    .limit(10)
    .get()

  const staffDoc = snapshot.docs.find((doc) => doc.id !== patientId)
  return staffDoc?.id || null
}

async function getOrCreatePatientChatRoom(db, patientId) {
  const accountSnap = await db.collection('patient_accounts').doc(patientId).get()
  if (!accountSnap.exists || accountSnap.data()?.active !== true) {
    const error = new Error('Patient account is not active.')
    error.code = 'permission-denied'
    throw error
  }

  const employeeId = await findSupportStaffId(db, patientId)
  if (!employeeId) {
    const error = new Error('No clinic staff is available for messaging right now.')
    error.code = 'failed-precondition'
    throw error
  }

  const participants = [patientId, employeeId].sort()
  const existing = await db
    .collection('chatRooms')
    .where('participants', '==', participants)
    .limit(1)
    .get()

  if (!existing.empty) {
    return { roomId: existing.docs[0].id, employeeId }
  }

  const account = accountSnap.data()
  const staffSnap = await db.collection('users').doc(employeeId).get()
  const staffName = staffSnap.data()?.displayName || 'Clinic staff'

  const roomRef = await db.collection('chatRooms').add({
    participants,
    participantInfo: {
      [patientId]: { displayName: account.displayName || 'Patient' },
      [employeeId]: { displayName: staffName },
    },
    lastMessage: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    resolved: false,
    unreadCount: {
      [patientId]: 0,
      [employeeId]: 0,
    },
  })

  return { roomId: roomRef.id, employeeId }
}

module.exports = { getOrCreatePatientChatRoom }
