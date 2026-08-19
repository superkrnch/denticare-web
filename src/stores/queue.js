import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection, doc, addDoc, updateDoc, query,
  where, orderBy, serverTimestamp, onSnapshot, writeBatch, runTransaction,
} from 'firebase/firestore'
import { useToastStore } from './toast'
import { db } from '@/firebase/config'
import { COLLECTIONS, QUEUE_STATUS } from '@/constants'
import {
  notifyStaffPatientCalled,
} from '@/utils/queueNotify'
import { useActivityStore } from './activities'

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

export const useQueueStore = defineStore('queue', () => {
  const queueItems = ref([])
  const loading = ref(false)
  let unsubscribe = null
  let subscriberCount = 0

  function waitingList() {
    return queueItems.value
      .filter((q) => q.status === QUEUE_STATUS.WAITING)
      .sort((a, b) => {
        const au = a.urgent ? 1 : 0
        const bu = b.urgent ? 1 : 0
        if (au !== bu) return bu - au
        return (a.queueNumber || 0) - (b.queueNumber || 0)
      })
  }

  function servingItem() {
    return queueItems.value.find((q) => q.status === QUEUE_STATUS.SERVING) || null
  }

  const currentServing = computed(() => servingItem())

  function findActiveEntry(patientId) {
    const today = todayKey()
    return queueItems.value.find((q) =>
      q.patientId === patientId
      && q.date === today
      && [QUEUE_STATUS.WAITING, QUEUE_STATUS.SERVING].includes(q.status),
    ) || null
  }

  function subscribeToday() {
    subscriberCount += 1
    if (unsubscribe) return

    const today = todayKey()
    const q = query(
      collection(db, COLLECTIONS.QUEUES),
      where('date', '==', today),
      orderBy('queueNumber', 'asc'),
    )
    unsubscribe = onSnapshot(q, (snap) => {
      queueItems.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    })
  }

  function unsubscribeQueue() {
    subscriberCount = Math.max(0, subscriberCount - 1)
    if (subscriberCount === 0 && unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  async function getNextQueueNumber() {
    const today = todayKey()
    const counterRef = doc(db, COLLECTIONS.QUEUE_COUNTERS, today)

    return runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef)
      const lastNumber = snap.exists() ? (snap.data().lastNumber || 0) : 0
      const nextNumber = lastNumber + 1
      tx.set(counterRef, {
        lastNumber: nextNumber,
        date: today,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      return nextNumber
    })
  }

  async function generateQueueNumber(patientId, patientName, options = {}) {
    const {
      appointmentId = null,
      dentistId = '',
      dentistName = '',
      patientPhone = '',
      patientEmail = '',
      notifyOnCall = true,
      urgent = false,
    } = options

    const existing = findActiveEntry(patientId)
    if (existing) {
      throw new Error(`${patientName} is already in the queue (#${existing.queueNumber}).`)
    }

    const today = todayKey()
    const nextNumber = await getNextQueueNumber()
    const activities = useActivityStore()

    const ref = await addDoc(collection(db, COLLECTIONS.QUEUES), {
      queueNumber: nextNumber,
      patientId,
      patientName,
      patientPhone: patientPhone || '',
      patientEmail: patientEmail || '',
      appointmentId,
      dentistId: dentistId || '',
      dentistName: dentistName || '',
      date: today,
      status: QUEUE_STATUS.WAITING,
      urgent: !!urgent,
      notifyOnCall,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await activities.log('queue', `Queue #${nextNumber} generated for ${patientName}`, { patientId })
    const toast = useToastStore()
    toast.success(`Queue #${nextNumber} created for ${patientName}.`)
    return { id: ref.id, queueNumber: nextNumber }
  }

  async function checkInFromAppointment(appointment, patient) {
    const existing = findActiveEntry(appointment.patientId)
    if (existing) {
      return { ...existing, alreadyInQueue: true }
    }

    const result = await generateQueueNumber(
      appointment.patientId,
      appointment.patientName,
      {
        appointmentId: appointment.id,
        dentistId: appointment.dentistId || '',
        dentistName: appointment.dentistName || '',
        patientPhone: patient?.contactNumber || patient?.phone || '',
        patientEmail: patient?.email || '',
        urgent: !!appointment.urgent,
      },
    )

    await updateDoc(doc(db, COLLECTIONS.APPOINTMENTS, appointment.id), {
      queueId: result.id,
      queueNumber: result.queueNumber,
      checkedInAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    const toast = useToastStore()
    toast.success(`${appointment.patientName} checked in — queue #${result.queueNumber}.`)

    return { ...result, alreadyInQueue: false }
  }

  async function notifyPatientCalled(entry) {
    if (!entry) return

    await notifyStaffPatientCalled({
      queueNumber: entry.queueNumber,
      patientName: entry.patientName,
      dentistName: entry.dentistName,
    })
  }

  async function callNext() {
    const waiting = waitingList()
    if (!waiting.length) return null

    const batch = writeBatch(db)
    const current = servingItem()
    if (current) {
      batch.update(doc(db, COLLECTIONS.QUEUES, current.id), {
        status: QUEUE_STATUS.COMPLETED,
        updatedAt: serverTimestamp(),
      })
    }

    const next = waiting[0]
    batch.update(doc(db, COLLECTIONS.QUEUES, next.id), {
      status: QUEUE_STATUS.SERVING,
      calledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
    await notifyPatientCalled(next)
    const toast = useToastStore()
    toast.info(`Calling queue #${next.queueNumber} — ${next.patientName}.`)
    return next
  }

  async function markServing(id) {
    const item = queueItems.value.find((q) => q.id === id)
    if (!item) return

    const batch = writeBatch(db)
    const current = servingItem()
    if (current && current.id !== id) {
      batch.update(doc(db, COLLECTIONS.QUEUES, current.id), {
        status: QUEUE_STATUS.COMPLETED,
        updatedAt: serverTimestamp(),
      })
    }
    batch.update(doc(db, COLLECTIONS.QUEUES, id), {
      status: QUEUE_STATUS.SERVING,
      calledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
    await notifyPatientCalled(item)
    const toast = useToastStore()
    toast.info(`Now serving queue #${item.queueNumber} — ${item.patientName}.`)
  }

  async function markCompleted(id) {
    await updateDoc(doc(db, COLLECTIONS.QUEUES, id), {
      status: QUEUE_STATUS.COMPLETED,
      updatedAt: serverTimestamp(),
    })
  }

  async function skipPatient(id) {
    await updateDoc(doc(db, COLLECTIONS.QUEUES, id), {
      status: QUEUE_STATUS.SKIPPED,
      updatedAt: serverTimestamp(),
    })
  }

  function estimatedWait(position) {
    return position * 15
  }

  function totalWaiting() {
    return waitingList().length
  }

  return {
    queueItems,
    currentServing,
    loading,
    subscribeToday,
    unsubscribeQueue,
    generateQueueNumber,
    checkInFromAppointment,
    callNext,
    markServing,
    markCompleted,
    skipPatient,
    waitingList,
    servingItem,
    findActiveEntry,
    estimatedWait,
    totalWaiting,
    notifyPatientCalled,
  }
})
