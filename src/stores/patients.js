import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/constants'
import { useActivityStore } from './activities'

function calculateAge(birthdate) {
  if (!birthdate) return ''
  const dob = new Date(birthdate)
  if (Number.isNaN(dob.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1
  return age
}

function mapPatient(d) {
  const data = d.data()
  return { id: d.id, ...data, age: calculateAge(data.birthdate) }
}

export const usePatientsStore = defineStore('patients', () => {
  const patients = ref([])
  const loading = ref(false)

  async function fetchPatients() {
    loading.value = true
    try {
      const snap = await getDocs(query(collection(db, COLLECTIONS.PATIENTS), orderBy('lastName', 'asc')))
      patients.value = snap.docs.map(mapPatient)
    } finally {
      loading.value = false
    }
  }

  async function getPatient(id) {
    const cached = patients.value.find((p) => p.id === id)
    if (cached) return cached
    const snap = await getDoc(doc(db, COLLECTIONS.PATIENTS, id))
    return snap.exists() ? mapPatient(snap) : null
  }

  async function addPatient(data) {
    const activities = useActivityStore()
    const payload = {
      ...data,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    delete payload.age
    const ref = await addDoc(collection(db, COLLECTIONS.PATIENTS), payload)
    await activities.log('patient', `Registered patient ${data.firstName} ${data.lastName}`, { patientId: ref.id })
    return ref.id
  }

  async function updatePatient(id, data) {
    const activities = useActivityStore()
    const payload = { ...data, updatedAt: serverTimestamp() }
    delete payload.age
    delete payload.id
    await updateDoc(doc(db, COLLECTIONS.PATIENTS, id), payload)
    await activities.log('patient', `Updated patient ${data.firstName} ${data.lastName}`, { patientId: id })
  }

  async function archivePatient(id) {
    await updateDoc(doc(db, COLLECTIONS.PATIENTS, id), {
      archived: true,
      updatedAt: serverTimestamp(),
    })
    patients.value = patients.value.filter((p) => p.id !== id)
  }

  function searchPatients(term = '', filters = {}) {
    const t = term.trim().toLowerCase()
    return patients.value
      .filter((p) => !p.archived)
      .filter((p) => (filters.sex ? p.sex === filters.sex : true))
      .filter((p) => {
        if (!t) return true
        return [fullNameOf(p), p.email, p.contactNumber]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(t))
      })
  }

  function fullNameOf(p) {
    return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  }

  return {
    patients, loading, fetchPatients, getPatient, addPatient,
    updatePatient, archivePatient, searchPatients,
  }
})
