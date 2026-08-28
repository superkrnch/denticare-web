<template>
  <div
    class="card overflow-hidden"
    :class="scrollable ? 'flex h-full min-h-0 flex-col' : ''"
  >
    <div v-if="loading" class="flex items-center justify-center gap-3 p-12 text-slate-500 dark:text-slate-400">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      <span class="text-sm">Loading...</span>
    </div>
    <div v-else-if="!items.length" class="p-4">
      <EmptyState :title="emptyTitle" :description="emptyDescription" />
    </div>
    <div
      v-else
      class="overflow-x-auto"
      :class="scrollable ? 'min-h-0 flex-1 overflow-y-auto' : ''"
    >
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/80"
            :class="scrollable ? 'sticky top-0 z-10 backdrop-blur-sm' : ''"
          >
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              :class="col.class"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr
            v-for="(item, idx) in items"
            :key="item.id || idx"
            class="transition-colors hover:bg-primary-50/40 dark:hover:bg-primary-950/20"
          >
            <td v-for="col in columns" :key="col.key" class="px-4 py-3.5 text-slate-700 dark:text-slate-300" :class="col.class">
              <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]">
                {{ item[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import EmptyState from './EmptyState.vue'

defineProps({
  columns: Array,
  items: Array,
  loading: Boolean,
  scrollable: { type: Boolean, default: false },
  emptyTitle: { type: String, default: 'No records found' },
  emptyDescription: String,
})
</script>
