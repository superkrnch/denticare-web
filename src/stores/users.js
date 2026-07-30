import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDocs, updateDoc, query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, ROLES } from '@/constants'

export const useUsersStore = defineStore('users', () => {
  const users = ref([])
  const loading = ref(false)

  async function fetchUsers() {
    loading.value = true
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.USERS))
      users.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } finally {
      loading.value = false
    }
  }

  async function getDentists() {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.USERS), where('role', '==', ROLES.DENTIST)),
    )
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => u.active !== false)
  }

  async function toggleActive(id, active) {
    await updateDoc(doc(db, COLLECTIONS.USERS, id), {
      active,
      updatedAt: serverTimestamp(),
    })
    const user = users.value.find((u) => u.id === id)
    if (user) user.active = active
  }

  return { users, loading, fetchUsers, getDentists, toggleActive }
})
