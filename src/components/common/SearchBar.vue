<template>
  <div class="relative">
    <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" :stroke-width="1.75" />
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="input pl-10"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<script setup>
import { Search } from '@lucide/vue'

defineProps({
  modelValue: String,
  placeholder: { type: String, default: 'Search...' },
})
defineEmits(['update:modelValue'])
</script>
