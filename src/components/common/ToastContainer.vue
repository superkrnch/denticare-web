<template>
  <div class="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-x-8"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-8"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg"
        :class="typeClasses[toast.type]"
      >
        <span class="flex-1">{{ toast.message }}</span>
        <button
          class="rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
          @click="toastStore.remove(toast.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
const typeClasses = {
  success: 'bg-teal-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-primary-600 text-white',
  warning: 'bg-amber-500 text-white',
}
</script>
