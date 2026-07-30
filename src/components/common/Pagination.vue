<template>
  <div class="flex items-center justify-between gap-2">
    <button
      class="btn-secondary px-3 py-1.5 text-xs"
      :disabled="currentPage <= 1"
      @click="$emit('update:currentPage', currentPage - 1)"
    >
      Previous
    </button>
    <span class="text-sm text-slate-600 dark:text-slate-400">
      Page {{ currentPage }} of {{ totalPages }}
    </span>
    <button
      class="btn-secondary px-3 py-1.5 text-xs"
      :disabled="currentPage >= totalPages"
      @click="$emit('update:currentPage', currentPage + 1)"
    >
      Next
    </button>
  </div>
</template>

<script setup>
defineProps({
  currentPage: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
})
defineEmits(['update:currentPage'])
</script>
