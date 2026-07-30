import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/constants'
import { useAuthStore } from './auth'
import { useActivityStore } from './activities'

export const useOdontogramStore = defineStore('odontogram', () => {
  const teeth = ref({})
  const history = ref([])
  const loading = ref(false)

  async function loadOdontogram(patientId) {
    loading.value = true
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.ODONTOGRAMS, patientId))
      teeth.value = snap.exists() ? (snap.data().teeth || {}) : {}

      const histSnap = await getDocs(
        query(
          collection(db, COLLECTIONS.ODONTOGRAMS, patientId, 'history'),
          orderBy('dateUpdated', 'desc'),
        ),
      )
      history.value = histSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } finally {
      loading.value = false
    }
  }

  async function updateTooth(patientId, toothNumber, data) {
    const auth = useAuthStore()
    const activities = useActivityStore()

    const entry = {
      status: data.status || 'healthy',
      treatment: data.treatment || '',
      notes: data.notes || '',
      dentistId: auth.user?.uid || '',
      dentistName: auth.displayName || 'Staff',
      updatedAt: new Date().toISOString(),
    }

    await setDoc(
      doc(db, COLLECTIONS.ODONTOGRAMS, patientId),
      { teeth: { [toothNumber]: entry }, updatedAt: serverTimestamp() },
      { merge: true },
    )

    await addDoc(collection(db, COLLECTIONS.ODONTOGRAMS, patientId, 'history'), {
      toothNumber,
      ...entry,
      dateUpdated: serverTimestamp(),
    })

    teeth.value = { ...teeth.value, [toothNumber]: entry }
    await activities.log('odontogram', `Updated tooth #${toothNumber} for patient`, { patientId })
    await loadOdontogram(patientId)
  }

  /** Apply the same status/treatment/notes to several teeth at once. */
  async function updateTeeth(patientId, toothNumbers, data) {
    const auth = useAuthStore()
    const activities = useActivityStore()

    const nums = Array.from(new Set((toothNumbers || []).map(Number))).filter(
      (n) => !Number.isNaN(n),
    )
    if (!nums.length) return

    const entry = {
      status: data.status || 'healthy',
      treatment: data.treatment || '',
      notes: data.notes || '',
      dentistId: auth.user?.uid || '',
      dentistName: auth.displayName || 'Staff',
      updatedAt: new Date().toISOString(),
    }

    const teethUpdate = {}
    for (const n of nums) teethUpdate[n] = entry

    await setDoc(
      doc(db, COLLECTIONS.ODONTOGRAMS, patientId),
      { teeth: teethUpdate, updatedAt: serverTimestamp() },
      { merge: true },
    )

    await Promise.all(
      nums.map((n) =>
        addDoc(collection(db, COLLECTIONS.ODONTOGRAMS, patientId, 'history'), {
          toothNumber: n,
          ...entry,
          dateUpdated: serverTimestamp(),
        }),
      ),
    )

    const merged = { ...teeth.value }
    for (const n of nums) merged[n] = entry
    teeth.value = merged
    await activities.log(
      'odontogram',
      `Updated ${nums.length} teeth (#${nums.join(', #')}) for patient`,
      { patientId },
    )
    await loadOdontogram(patientId)
  }

  return { teeth, history, loading, loadOdontogram, updateTooth, updateTeeth }
})
