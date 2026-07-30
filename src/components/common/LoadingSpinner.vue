<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-slate-950/70">
    <div class="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-900 dark:shadow-black/40">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-primary-900 dark:border-t-primary-400" />
      <p v-if="text" class="text-sm font-medium text-slate-600 dark:text-slate-300">{{ text }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({ show: Boolean, text: { type: String, default: 'Loading...' } })
</script>
