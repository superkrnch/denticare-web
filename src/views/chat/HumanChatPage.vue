<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
    <div class="flex-1 px-10 py-4 overflow-y-auto">
      <div v-if="isLoading" class="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
      <div v-else-if="messages.length === 0" class="flex justify-center items-center h-full">
        <EmptyState
          title="Start a Conversation"
          description="Send a message to our support team, and we'll get back to you as soon as possible."
        />
      </div>
      <div v-else>
        <div
          v-for="message in messages"
          :key="message.id"
          class="group flex mb-4"
          :class="message.senderId === user.uid ? 'justify-end' : 'justify-start'"
        >
          <div
            class="relative max-w-[85%] cursor-default select-none rounded-2xl px-4 py-3 sm:max-w-[80%]"
            :class="
              message.senderId === user.uid
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
            "
            v-bind="messageLongPressHandlers(message.id)"
          >
            <p class="whitespace-pre-wrap break-words text-sm">{{ message.text }}</p>
            <p class="mt-1 text-right text-[11px] opacity-70">{{ formatTimestamp(message.timestamp) }}</p>
          </div>
        </div>
      </div>
    </div>
    <p v-if="errorMessage" class="px-4 pb-3 text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>

    <DeleteMessageDialog
      :show="!!pendingDeleteId"
      :can-delete-for-everyone="canDeletePendingForEveryone"
      :loading="!!deletingId"
      @cancel="pendingDeleteId = null"
      @delete-for-me="hideMessageForMe"
      @delete-for-everyone="deleteMessageForEveryone"
    />

    <div class="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center">
        <input
          ref="messageInput"
          v-model="newMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Type your message..."
          class="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <button
          type="button"
          @mousedown.prevent
          @click="sendMessage"
          :disabled="!newMessage.trim() || isSending"
          class="ml-3 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          <span v-if="!isSending">Send</span>
          <LoadingSpinner v-else size="sm" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import chatService from '@/utils/chatService';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import DeleteMessageDialog from '@/components/common/DeleteMessageDialog.vue';
import { useToastStore } from '@/stores/toast';
import { useLongPress } from '@/composables/useLongPress';

const authStore = useAuthStore();
const toast = useToastStore();
const user = authStore.user;

const chatRoomId = ref(null);
const messages = ref([]);
const newMessage = ref('');
const isLoading = ref(true);
const isSending = ref(false);
const deletingId = ref(null);
const pendingDeleteId = ref(null);
const errorMessage = ref('');
const messageInput = ref(null);
let unsubscribe = null;

const pendingDeleteMessage = computed(() => messages.value.find((message) => message.id === pendingDeleteId.value) || null);
const canDeletePendingForEveryone = computed(() => pendingDeleteMessage.value?.senderId === user.uid);

const { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onContextMenu } = useLongPress((messageId) => {
  if (!deletingId.value) requestDeleteMessage(messageId);
});

function messageLongPressHandlers(messageId) {
  return {
    onPointerdown: (event) => onPointerDown(event, messageId),
    onPointerup: onPointerUp,
    onPointerleave: onPointerLeave,
    onPointercancel: onPointerCancel,
    onContextmenu: (event) => onContextMenu(event, messageId),
  };
}

function focusMessageInput() {
  nextTick(() => {
    requestAnimationFrame(() => messageInput.value?.focus());
  });
}

onMounted(async () => {
  if (!user || !user.uid) {
    console.error('User not authenticated');
    isLoading.value = false;
    return;
  }
  try {
    const supportEmployeeId = await chatService.getSupportEmployeeId(user.uid);
    const roomId = await chatService.getOrCreateChatRoom(user.uid, supportEmployeeId);
    chatRoomId.value = roomId;

    unsubscribe = chatService.onMessagesUpdate(roomId, (updatedMessages) => {
      messages.value = updatedMessages;
      scrollToBottom();
      markMessagesAsRead(updatedMessages);
    }, (error) => {
      errorMessage.value = 'Messages could not be loaded. Please try again.';
      toast.error(error.message);
    }, { viewerId: user.uid });
  } catch (error) {
    console.error('Error setting up chat:', error);
    errorMessage.value = error.message || 'Chat could not be opened.';
    toast.error(errorMessage.value);
  } finally {
    isLoading.value = false;
    focusMessageInput();
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

const sendMessage = async () => {
  if (!newMessage.value.trim() || !chatRoomId.value) return;

  isSending.value = true;
  try {
    await chatService.sendMessage(chatRoomId.value, newMessage.value, user.uid);
    newMessage.value = '';
    scrollToBottom();
    focusMessageInput();
  } catch (error) {
    console.error('Error sending message:', error);
    toast.error(error.message || 'Message could not be sent.');
  } finally {
    isSending.value = false;
    focusMessageInput();
  }
};

const requestDeleteMessage = (messageId) => {
  if (!chatRoomId.value || deletingId.value) return;
  pendingDeleteId.value = messageId;
};

const hideMessageForMe = async () => {
  if (!pendingDeleteId.value || !chatRoomId.value || deletingId.value) return;

  deletingId.value = pendingDeleteId.value;
  try {
    await chatService.hideMessageForUser(chatRoomId.value, pendingDeleteId.value, user.uid);
    toast.success('Message removed for you.');
    pendingDeleteId.value = null;
  } catch (error) {
    console.error('Error hiding message:', error);
    toast.error(error.message || 'Message could not be removed.');
  } finally {
    deletingId.value = null;
  }
};

const deleteMessageForEveryone = async () => {
  if (!pendingDeleteId.value || !chatRoomId.value || deletingId.value) return;

  deletingId.value = pendingDeleteId.value;
  try {
    await chatService.deleteMessage(chatRoomId.value, pendingDeleteId.value, user.uid);
    toast.success('Message deleted for everyone.');
    pendingDeleteId.value = null;
  } catch (error) {
    console.error('Error deleting message:', error);
    toast.error(error.message || 'Message could not be deleted.');
  } finally {
    deletingId.value = null;
  }
};

const markMessagesAsRead = (messagesToMark) => {
  if (!chatRoomId.value || !user) return;
  messagesToMark.forEach(message => {
    // Mark as read if the message was not sent by the current user and hasn't been read by them
    if (message.senderId !== user.uid && (!message.readBy || !message.readBy[user.uid])) {
      chatService.markMessageAsRead(chatRoomId.value, message.id, user.uid);
    }
  });
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const scrollToBottom = () => {
  nextTick(() => {
    const container = document.querySelector('.overflow-y-auto');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
};

watch(messages, () => {
  scrollToBottom();
}, { deep: true });
</script>
