<template>
  <BaseModal :show="show" :title="title" size="sm" :close-on-backdrop="!loading" @close="handleCancel">
    <div class="space-y-5">
      <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{{ message }}</p>
      <p v-if="warning" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        {{ warning }}
      </p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" :disabled="loading" @click="handleCancel">
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          :class="variant === 'danger' ? 'btn-danger' : 'btn-primary'"
          :disabled="loading"
          @click="$emit('confirm')"
        >
          {{ loading ? loadingLabel : confirmLabel }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Are you sure?' },
  message: { type: String, required: true },
  warning: { type: String, default: 'This action cannot be undone.' },
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  loadingLabel: { type: String, default: 'Please wait...' },
  loading: { type: Boolean, default: false },
  variant: { type: String, default: 'danger' },
})

const emit = defineEmits(['confirm', 'cancel'])

function handleCancel() {
  emit('cancel')
}
</script>
