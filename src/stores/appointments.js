import { format } from 'date-fns'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDocs, addDoc, updateDoc, query,
  where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, APPOINTMENT_STATUS } from '@/constants'
import { generateId } from '@/utils/helpers'
import { useActivityStore } from './activities'
import { useAuthStore } from './auth'
import { useToastStore } from './toast'

export const useAppointmentsStore = defineStore('appointments', () => {
  const appointments = ref([])
  const loading = ref(false)
  let _unsubscribe = null

  async function fetchAppointments() {
    loading.value = true
    const snap = await getDocs(query(collection(db, COLLECTIONS.APPOINTMENTS), orderBy('date', 'desc')))
    appointments.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    loading.value = false
  }

  async function checkConflict({ dentistId, date, time, excludeId }) {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.APPOINTMENTS),
        where('dentistId', '==', dentistId),
        where('date', '==', date),
        where('time', '==', time),
      ),
    )
    const conflicts = snap.docs.filter((d) => {
      if (excludeId && d.id === excludeId) return false
      const status = d.data().status
      return ![APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.NO_SHOW].includes(status)
    })
    return conflicts.length > 0
  }

  async function createAppointment(data) {
    const conflict = await checkConflict(data)
    if (conflict) throw new Error('Schedule conflict: dentist is already booked at this time.')

    const activities = useActivityStore()
    const auth = useAuthStore()
    const payload = {
      ...data,
      urgent: !!data.urgent,
      appointmentId: generateId('APT'),
      createdBy: auth.user ? auth.user.uid : null,
      status: data.status || APPOINTMENT_STATUS.PENDING,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const ref = await addDoc(collection(db, COLLECTIONS.APPOINTMENTS), payload)
    await activities.log('appointment', `Created appointment ${payload.appointmentId}`, { appointmentId: ref.id })
    return ref.id
  }

  function initRealtime() {
    // avoid duplicate listeners
    if (_unsubscribe) return
    const toasts = useToastStore()
    const auth = useAuthStore()
    const q = query(collection(db, COLLECTIONS.APPOINTMENTS), orderBy('date', 'desc'))
    _unsubscribe = onSnapshot(q, (snap) => {
      appointments.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      snap.docChanges().forEach((ch) => {
        if (ch.type === 'added') {
          const d = ch.doc.data()
          // ignore creations by current user
          if (auth.user && d.createdBy && d.createdBy === auth.user.uid) return
          const id = d.appointmentId || ch.doc.id
          toasts.info(`New appointment ${id} — ${d.patientName || ''}`)
        }
      })
    })
  }

  function stopRealtime() {
    if (_unsubscribe) {
      _unsubscribe()
      _unsubscribe = null
    }
  }

  async function updateAppointment(id, data) {
    if (data.dentistId && data.date && data.time) {
      const conflict = await checkConflict({ ...data, excludeId: id })
      if (conflict) throw new Error('Schedule conflict: dentist is already booked at this time.')
    }
    const activities = useActivityStore()
    await updateDoc(doc(db, COLLECTIONS.APPOINTMENTS, id), { ...data, updatedAt: serverTimestamp() })
    await activities.log('appointment', `Updated appointment`, { appointmentId: id })
  }

  async function updateStatus(id, status) {
    await updateAppointment(id, { status })
  }

  function getTodayAppointments() {
    const today = format(new Date(), 'yyyy-MM-dd')
    return appointments.value.filter((a) => a.date === today)
  }

  function getByPatient(patientId) {
    return appointments.value.filter((a) => a.patientId === patientId)
  }

  function filterByStatus(status) {
    return appointments.value.filter((a) => a.status === status)
  }

  return {
    appointments, loading, fetchAppointments, createAppointment, updateAppointment,
    updateStatus, checkConflict, getTodayAppointments, getByPatient, filterByStatus,
  }
})
