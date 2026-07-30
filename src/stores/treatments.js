import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, TREATMENT_STATUS } from '@/constants'
import { useActivityStore } from './activities'

export const useTreatmentsStore = defineStore('treatments', () => {
  const treatments = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const snap = await getDocs(query(collection(db, COLLECTIONS.TREATMENTS), orderBy('createdAt', 'desc')))
      treatments.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } finally {
      loading.value = false
    }
  }

  async function fetchByPatient(patientId) {
    loading.value = true
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.TREATMENTS), where('patientId', '==', patientId)),
      )
      treatments.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } finally {
      loading.value = false
    }
  }

  async function createTreatment(data) {
    const activities = useActivityStore()
    const payload = {
      patientId: data.patientId,
      patientName: data.patientName || '',
      procedureName: data.procedureName,
      toothNumber: data.toothNumber ?? null,
      cost: Number(data.cost) || 0,
      status: data.status || TREATMENT_STATUS.PLANNED,
      notes: data.notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const ref = await addDoc(collection(db, COLLECTIONS.TREATMENTS), payload)
    await activities.log('treatment', `Created treatment plan: ${payload.procedureName}`, { patientId: data.patientId })
    return ref.id
  }

  async function updateTreatment(id, data) {
    const payload = { ...data, updatedAt: serverTimestamp() }
    delete payload.id
    if (payload.cost !== undefined) payload.cost = Number(payload.cost) || 0
    await updateDoc(doc(db, COLLECTIONS.TREATMENTS, id), payload)
  }

  async function markComplete(id) {
    await updateDoc(doc(db, COLLECTIONS.TREATMENTS, id), {
      status: TREATMENT_STATUS.COMPLETED,
      updatedAt: serverTimestamp(),
    })
  }

  async function deleteTreatment(id) {
    await deleteDoc(doc(db, COLLECTIONS.TREATMENTS, id))
    treatments.value = treatments.value.filter((t) => t.id !== id)
  }

  function getCommonTreatments() {
    const counts = {}
    for (const t of treatments.value) {
      const name = t.procedureName || 'Other'
      counts[name] = (counts[name] || 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }

  return {
    treatments, loading, fetchAll, fetchByPatient, createTreatment,
    updateTreatment, markComplete, deleteTreatment, getCommonTreatments,
  }
})
