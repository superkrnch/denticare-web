<template>
  <BaseModal :show="show" title="Delete message" size="sm" :close-on-backdrop="!loading" @close="handleCancel">
    <div class="space-y-5">
      <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Choose how you want to remove this message.
      </p>
      <div class="space-y-2">
        <button
          type="button"
          class="flex w-full flex-col gap-1 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800/60"
          :disabled="loading"
          @click="$emit('delete-for-me')"
        >
          <span class="font-medium text-slate-900 dark:text-white">Delete for you</span>
          <span class="text-xs text-slate-500 dark:text-slate-400">Removes the message from your view only.</span>
        </button>
        <button
          v-if="canDeleteForEveryone"
          type="button"
          class="flex w-full flex-col gap-1 rounded-xl border border-red-200 px-4 py-3 text-left transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:hover:bg-red-950/30"
          :disabled="loading"
          @click="$emit('delete-for-everyone')"
        >
          <span class="font-medium text-red-700 dark:text-red-300">Delete for everyone</span>
          <span class="text-xs text-red-600/80 dark:text-red-300/80">Permanently removes it for all participants.</span>
        </button>
      </div>
      <div class="flex justify-end">
        <button type="button" class="btn-secondary" :disabled="loading" @click="handleCancel">
          Cancel
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  show: { type: Boolean, default: false },
  canDeleteForEveryone: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['delete-for-me', 'delete-for-everyone', 'cancel'])

function handleCancel() {
  emit('cancel')
}
</script>
