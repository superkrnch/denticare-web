<template>
  <div class="page-scroll-layout">
    <div
      class="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      :class="isDesktop ? 'lg:grid-cols-[20rem_1fr]' : 'grid-cols-1'"
    >
      <aside
        v-show="isDesktop || !selectedRoomId"
        class="flex min-h-0 flex-col border-b border-slate-200 dark:border-slate-800"
        :class="isDesktop ? 'lg:border-b-0 lg:border-r' : ''"
      >
        <div class="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 class="font-semibold text-slate-900 dark:text-white">Patient messages</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Respond to patients in real time.</p>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <div v-if="loadingRooms" class="p-5 text-sm text-slate-500">Loading conversations...</div>
          <div v-else-if="rooms.length === 0" class="p-5 text-sm text-slate-500">No patient conversations yet.</div>
          <button
            v-for="room in rooms"
            :key="room.id"
            class="w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            :class="selectedRoomId === room.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''"
            @click="selectRoom(room.id)"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="truncate font-medium text-slate-800 dark:text-slate-100">{{ conversationTitle(room) }}</span>
              <span v-if="room.unreadCount?.[user.uid]" class="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                {{ room.unreadCount[user.uid] }}
              </span>
            </div>
            <p class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{{ room.lastMessage?.text || 'No messages yet' }}</p>
            <p class="mt-1 text-xs text-slate-400">{{ formatTimestamp(room.lastMessage?.timestamp) }}</p>
          </button>
        </div>
      </aside>

      <section v-show="isDesktop || selectedRoomId" class="flex min-h-0 flex-col">
        <div v-if="selectedRoom" class="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
          <button
            v-if="!isDesktop"
            type="button"
            class="btn-ghost p-2"
            aria-label="Back to conversations"
            @click="backToList"
          >
            <ArrowLeft class="h-5 w-5" :stroke-width="1.75" />
          </button>
          <div class="min-w-0 flex-1">
            <h2 class="truncate font-semibold text-slate-900 dark:text-white">{{ conversationTitle(selectedRoom) }}</h2>
            <p class="text-xs text-slate-500">{{ selectedRoom.resolved ? 'Resolved' : 'Open conversation' }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button v-if="!selectedRoom.resolved && canReply" class="btn-secondary text-xs" :disabled="working" @click="resolveConversation">
              Mark resolved
            </button>
            <button
              v-if="isAdmin"
              type="button"
              class="btn-danger text-xs"
              :disabled="working"
              @click="requestDeleteConversation"
            >
              Delete conversation
            </button>
          </div>
        </div>

        <EmptyState
          v-if="!selectedRoom"
          title="Select a conversation"
          description="Patient conversations will appear here."
        />

        <template v-else>
          <div ref="messageContainer" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-10 py-4 sm:px-12 sm:py-5">
            <div v-if="loadingMessages" class="text-sm text-slate-500">Loading messages...</div>
            <EmptyState v-else-if="messages.length === 0" title="No messages yet" description="This conversation is ready for your reply." />
            <div v-for="message in messages" :key="message.id" class="group flex" :class="message.senderId === user.uid ? 'justify-end' : 'justify-start'">
              <div
                class="relative max-w-[85%] cursor-default select-none rounded-2xl px-4 py-3 sm:max-w-[80%]"
                :class="message.senderId === user.uid ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'"
                v-bind="messageLongPressHandlers(message.id)"
              >
                <p class="whitespace-pre-wrap break-words text-sm">{{ message.text }}</p>
                <p class="mt-1 text-right text-[11px] opacity-70">{{ formatTimestamp(message.timestamp) }}</p>
              </div>
            </div>
          </div>
          <form
            v-if="canReply"
            class="flex shrink-0 gap-2 border-t border-slate-200 p-3 dark:border-slate-800 sm:gap-3 sm:p-4"
            @submit.prevent="sendMessage"
          >
            <input
              ref="messageInput"
              v-model="newMessage"
              class="input min-w-0 flex-1"
              placeholder="Reply to patient..."
              maxlength="12000"
            />
            <button class="btn-primary shrink-0" type="submit" :disabled="sending || !newMessage.trim()" @mousedown.prevent>
              {{ sending ? 'Sending...' : 'Send' }}
            </button>
          </form>
          <p
            v-else-if="isAdmin"
            class="shrink-0 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 sm:px-5"
          >
            View-only — you are not a participant in this conversation.
          </p>
        </template>

        <p v-if="errorMessage" class="shrink-0 border-t border-red-100 px-5 py-3 text-sm text-red-600">{{ errorMessage }}</p>
      </section>
    </div>

    <DeleteMessageDialog
      :show="confirmAction?.type === 'message'"
      :can-delete-for-everyone="canDeletePendingForEveryone"
      :loading="confirmLoading"
      @cancel="confirmAction = null"
      @delete-for-me="hideMessageForMe"
      @delete-for-everyone="deleteMessageForEveryone"
    />

    <ConfirmDialog
      :show="confirmAction?.type === 'conversation'"
      :title="confirmTitle"
      :message="confirmMessage"
      :loading="confirmLoading"
      confirm-label="Delete"
      loading-label="Deleting..."
      @cancel="confirmAction = null"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeft } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { ROLES } from '@/constants'
import chatService from '@/utils/chatService'
import EmptyState from '@/components/common/EmptyState.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import DeleteMessageDialog from '@/components/common/DeleteMessageDialog.vue'
import { useLongPress } from '@/composables/useLongPress'

const auth = useAuthStore()
const toast = useToastStore()
const user = auth.user
const rooms = ref([])
const selectedRoomId = ref(null)
const messages = ref([])
const newMessage = ref('')
const loadingRooms = ref(true)
const loadingMessages = ref(false)
const sending = ref(false)
const deletingId = ref(null)
const working = ref(false)
const errorMessage = ref('')
const messageContainer = ref(null)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const confirmAction = ref(null)
const confirmLoading = ref(false)
const messageInput = ref(null)

const selectedRoom = ref(null)
const isDesktop = computed(() => viewportWidth.value >= 1024)
const isStaff = computed(() => auth.hasRole(ROLES.ADMIN, ROLES.DENTIST, ROLES.ASSISTANT))
const isAdmin = computed(() => auth.isAdmin)
const canReply = computed(() => selectedRoom.value?.participants?.includes(user.uid))

function conversationTitle(room) {
  if (!room?.participants?.length) return 'Conversation'
  const otherParticipantId = room.participants.find((id) => id !== user.uid)
  if (otherParticipantId) {
    return room.participantInfo?.[otherParticipantId]?.displayName || `Patient ${otherParticipantId.slice(0, 6)}`
  }
  const names = room.participants
    .map((id) => room.participantInfo?.[id]?.displayName || `User ${id.slice(0, 6)}`)
    .filter(Boolean)
  return names.join(' · ') || 'Conversation'
}

function canDeleteMessage() {
  return true
}

const { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onContextMenu } = useLongPress((messageId) => {
  if (!deletingId.value) requestDeleteMessage(messageId)
})

function messageLongPressHandlers(messageId) {
  return {
    onPointerdown: (event) => onPointerDown(event, messageId),
    onPointerup: onPointerUp,
    onPointerleave: onPointerLeave,
    onPointercancel: onPointerCancel,
    onContextmenu: (event) => onContextMenu(event, messageId),
  }
}

const pendingDeleteMessage = computed(() => {
  if (confirmAction.value?.type !== 'message') return null
  return messages.value.find((message) => message.id === confirmAction.value.messageId) || null
})

const canDeletePendingForEveryone = computed(() => {
  const message = pendingDeleteMessage.value
  if (!message) return false
  return message.senderId === user.uid || isStaff.value
})

const confirmTitle = computed(() => (
  confirmAction.value?.type === 'conversation' ? 'Delete conversation?' : 'Delete message?'
))

const confirmMessage = computed(() => {
  if (!confirmAction.value) return ''
  if (confirmAction.value.type === 'conversation') {
    return `You are about to permanently delete the entire conversation with ${conversationTitle(selectedRoom.value)}. All messages will be removed for both participants.`
  }
  return 'You are about to permanently delete this message. It will be removed for everyone in this conversation.'
})

function requestDeleteMessage(messageId) {
  if (!selectedRoomId.value || deletingId.value) return
  confirmAction.value = { type: 'message', messageId }
}

function requestDeleteConversation() {
  if (!selectedRoomId.value || working.value) return
  confirmAction.value = { type: 'conversation' }
}

let unsubscribeRooms = null
let unsubscribeMessages = null

function formatTimestamp(timestamp) {
  if (!timestamp) return ''
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

function onResize() {
  viewportWidth.value = window.innerWidth
}

function focusMessageInput() {
  nextTick(() => {
    requestAnimationFrame(() => messageInput.value?.focus())
  })
}

function backToList() {
  selectedRoomId.value = null
  selectedRoom.value = null
  messages.value = []
  unsubscribeMessages?.()
  unsubscribeMessages = null
}

function selectRoom(roomId) {
  selectedRoomId.value = roomId
  selectedRoom.value = rooms.value.find((room) => room.id === roomId) || null
  messages.value = []
  unsubscribeMessages?.()
  if (!selectedRoom.value) return
  loadingMessages.value = true
  unsubscribeMessages = chatService.onMessagesUpdate(roomId, (items) => {
    messages.value = items
    loadingMessages.value = false
    items.filter((message) => message.senderId !== user.uid && !message.readBy?.[user.uid])
      .forEach((message) => chatService.markMessageAsRead(roomId, message.id, user.uid).catch(() => {}))
    nextTick(() => {
      if (messageContainer.value) messageContainer.value.scrollTop = messageContainer.value.scrollHeight
      focusMessageInput()
    })
  }, handleError, { viewerId: user.uid })
  focusMessageInput()
}

async function sendMessage() {
  if (!selectedRoomId.value || !newMessage.value.trim()) return
  sending.value = true
  try {
    await chatService.sendMessage(selectedRoomId.value, newMessage.value, user.uid)
    newMessage.value = ''
    focusMessageInput()
  } catch (error) {
    handleError(error)
  } finally {
    sending.value = false
    focusMessageInput()
  }
}

async function handleConfirmDelete() {
  if (confirmAction.value?.type === 'conversation') {
    await deleteConversation()
  }
}

async function hideMessageForMe() {
  if (!selectedRoomId.value || confirmAction.value?.type !== 'message' || deletingId.value) return

  const messageId = confirmAction.value.messageId
  confirmLoading.value = true
  deletingId.value = messageId
  try {
    await chatService.hideMessageForUser(selectedRoomId.value, messageId, user.uid)
    toast.success('Message removed for you.')
    confirmAction.value = null
  } catch (error) {
    handleError(error)
  } finally {
    deletingId.value = null
    confirmLoading.value = false
  }
}

async function deleteMessageForEveryone() {
  if (!selectedRoomId.value || confirmAction.value?.type !== 'message' || deletingId.value) return

  const messageId = confirmAction.value.messageId
  confirmLoading.value = true
  deletingId.value = messageId
  try {
    await chatService.deleteMessage(selectedRoomId.value, messageId, user.uid, { allowAny: isStaff.value })
    toast.success('Message deleted for everyone.')
    confirmAction.value = null
  } catch (error) {
    handleError(error)
  } finally {
    deletingId.value = null
    confirmLoading.value = false
  }
}

async function resolveConversation() {
  working.value = true
  try {
    await chatService.markConversationAsResolved(selectedRoomId.value)
    toast.success('Conversation marked as resolved.')
  } catch (error) {
    handleError(error)
  } finally {
    working.value = false
  }
}

async function deleteConversation() {
  if (!selectedRoomId.value || working.value) return

  working.value = true
  confirmLoading.value = true
  try {
    unsubscribeMessages?.()
    unsubscribeMessages = null
    await chatService.deleteConversation(selectedRoomId.value)
    confirmAction.value = null
    backToList()
    toast.success('Conversation deleted.')
  } catch (error) {
    handleError(error)
    if (selectedRoomId.value) {
      selectRoom(selectedRoomId.value)
    }
  } finally {
    working.value = false
    confirmLoading.value = false
  }
}

function handleError(error) {
  errorMessage.value = error?.message || 'The chat could not be loaded.'
  toast.error(errorMessage.value)
  loadingRooms.value = false
  loadingMessages.value = false
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  unsubscribeRooms = chatService.onChatRoomsUpdate(user.uid, (items) => {
    rooms.value = items
    loadingRooms.value = false

    if (selectedRoomId.value) {
      selectedRoom.value = items.find((room) => room.id === selectedRoomId.value) || null
      if (!selectedRoom.value) backToList()
      return
    }

    if (isDesktop.value && items[0]?.id) {
      selectRoom(items[0].id)
    }
  }, handleError, { allRooms: auth.isAdmin })
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  unsubscribeRooms?.()
  unsubscribeMessages?.()
})
</script>
