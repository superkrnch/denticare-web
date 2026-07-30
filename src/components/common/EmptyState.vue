<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
      <component :is="icon" class="h-6 w-6" :stroke-width="1.75" />
    </div>
    <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { Inbox } from '@lucide/vue'

defineProps({
  title: { type: String, default: 'Nothing here yet' },
  description: String,
  icon: { type: [Object, Function], default: () => Inbox },
})
</script>
