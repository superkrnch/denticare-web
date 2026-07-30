import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, addDoc, query, orderBy, limit as fbLimit,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/constants'
import { useAuthStore } from './auth'

export const useActivityStore = defineStore('activities', () => {
  const recent = ref([])

  async function log(type, description, meta = {}) {
    try {
      const auth = useAuthStore()
      await addDoc(collection(db, COLLECTIONS.ACTIVITIES), {
        type,
        description,
        meta: meta || {},
        userId: auth.user?.uid || '',
        userName: auth.displayName || 'System',
        createdAt: serverTimestamp(),
      })
    } catch {
      // activity logging should never block the primary action
    }
  }

  function subscribeRecent(count = 10) {
    const q = query(
      collection(db, COLLECTIONS.ACTIVITIES),
      orderBy('createdAt', 'desc'),
      fbLimit(count),
    )
    return onSnapshot(q, (snap) => {
      recent.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    })
  }

  return { recent, log, subscribeRecent }
})
