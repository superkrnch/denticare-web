import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import chatService from '@/utils/chatService'
import { useAuthStore } from './auth'
import { useToastStore } from './toast'

function patientLabel(room, userId) {
  const otherId = room.participants?.find((id) => id !== userId)
  if (otherId) {
    return room.participantInfo?.[otherId]?.displayName || `Patient ${otherId.slice(0, 6)}`
  }
  const names = (room.participants || [])
    .map((id) => room.participantInfo?.[id]?.displayName)
    .filter(Boolean)
  return names[0] || 'Patient'
}

export const usePatientMessagesStore = defineStore('patientMessages', () => {
  const rooms = ref([])
  const ready = ref(false)

  let unsubscribe = null
  let knownUnread = {}
  let suppressAlerts = false

  const totalUnread = computed(() => {
    const auth = useAuthStore()
    const uid = auth.user?.uid
    if (!uid) return 0
    return rooms.value.reduce((sum, room) => sum + (room.unreadCount?.[uid] || 0), 0)
  })

  function subscribe() {
    const auth = useAuthStore()
    if (!auth.user?.uid || unsubscribe) return

    const userId = auth.user.uid
    const allRooms = auth.isAdmin

    unsubscribe = chatService.onChatRoomsUpdate(userId, (items) => {
      rooms.value = items

      if (!ready.value) {
        items.forEach((room) => {
          knownUnread[room.id] = room.unreadCount?.[userId] || 0
        })
        ready.value = true
        return
      }

      if (suppressAlerts) return

      const toast = useToastStore()
      items.forEach((room) => {
        const unread = room.unreadCount?.[userId] || 0
        const previous = knownUnread[room.id] ?? unread
        knownUnread[room.id] = unread

        if (unread <= previous) return

        const preview = room.lastMessage?.text?.trim()
        const label = patientLabel(room, userId)
        toast.notify(
          preview
            ? `New message from ${label}: ${preview.length > 60 ? `${preview.slice(0, 60)}…` : preview}`
            : `New message from ${label}`,
        )
      })
    }, () => {}, { allRooms })
  }

  function unsubscribeRooms() {
    unsubscribe?.()
    unsubscribe = null
    rooms.value = []
    knownUnread = {}
    ready.value = false
  }

  function setSuppressAlerts(value) {
    suppressAlerts = value
  }

  return {
    rooms,
    totalUnread,
    ready,
    subscribe,
    unsubscribeRooms,
    setSuppressAlerts,
  }
})
