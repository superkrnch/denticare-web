import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/constants'
import { useAuthStore } from './auth'

// Simple presence store for users who are currently entering/editing appointments.
export const useEditingStore = defineStore('editing', () => {
  const presences = ref([])
  const _addedCallbacks = []
  const _removedCallbacks = []

  const auth = useAuthStore()

  // Listen to editing collection realtime
  try {
    const q = collection(db, COLLECTIONS.EDITING)
    onSnapshot(q, (snap) => {
      presences.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      // emit changes
      snap.docChanges().forEach((ch) => {
        const data = { id: ch.doc.id, ...ch.doc.data() }
        if (ch.type === 'added') _addedCallbacks.forEach((cb) => cb(data))
        if (ch.type === 'removed') _removedCallbacks.forEach((cb) => cb(data))
      })
    })
  } catch (e) {
    // ignore listen errors
    // console.warn('editing store snapshot failed', e)
  }

  async function startEditing(appointmentId = null) {
    if (!auth.user) return
    const userId = auth.user.uid
    const name = auth.displayName || auth.profile?.displayName || 'Someone'
    await setDoc(doc(db, COLLECTIONS.EDITING, userId), {
      userId,
      name,
      appointmentId: appointmentId || null,
      startedAt: serverTimestamp(),
    })
  }

  async function stopEditing() {
    if (!auth.user) return
    const userId = auth.user.uid
    try {
      await deleteDoc(doc(db, COLLECTIONS.EDITING, userId))
    } catch (e) {
      // ignore
    }
  }

  function onPresenceAdded(cb) {
    _addedCallbacks.push(cb)
  }

  function onPresenceRemoved(cb) {
    _removedCallbacks.push(cb)
  }

  return { presences, startEditing, stopEditing, onPresenceAdded, onPresenceRemoved }
})
