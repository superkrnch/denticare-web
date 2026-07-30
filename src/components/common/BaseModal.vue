<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeOnBackdrop && $emit('close')" />
    <div
      class="relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      :class="sizeClass"
    >
      <div v-if="title" class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-50">{{ title }}</h3>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  title: String,
  size: { type: String, default: 'md' },
  closeOnBackdrop: { type: Boolean, default: true },
})
defineEmits(['close'])

const sizeClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}[props.size] || 'max-w-lg'))
</script>
