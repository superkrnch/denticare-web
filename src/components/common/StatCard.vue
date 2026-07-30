<template>
  <div class="card-hover p-5">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-slate-500">{{ title }}</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{{ value }}</p>
        <p v-if="subtitle" class="mt-1 text-xs text-slate-400">{{ subtitle }}</p>
      </div>
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        :class="iconBg"
      >
        <component :is="icon" class="h-5 w-5" :class="iconColor" :stroke-width="1.75" />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  value: [String, Number],
  subtitle: String,
  icon: { type: [Object, Function], required: true },
  iconBg: { type: String, default: 'bg-primary-50' },
  iconColor: { type: String, default: 'text-primary-600' },
})
</script>
