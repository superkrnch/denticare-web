<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
    :class="colorClass"
  >
    {{ label || status }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: String,
  label: String,
})

const colorMap = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  completed: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  no_show: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
  waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  serving: 'bg-primary-100 text-primary-800 dark:bg-primary-950/50 dark:text-primary-300',
  skipped: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  ongoing: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
  unpaid: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  paid: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
  active: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
}

const colorClass = computed(() => colorMap[props.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')
</script>
