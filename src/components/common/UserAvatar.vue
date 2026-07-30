<template>
  <div
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300"
    :class="sizeClass"
  >
    <img
      v-if="src && !broken"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      @error="broken = true"
    />
    <span v-else class="select-none uppercase">{{ initials }}</span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  size: { type: String, default: 'md' },
  alt: { type: String, default: 'Profile photo' },
})

const broken = ref(false)
const src = computed(() => props.photoUrl || '')

const sizeClass = computed(() => ({
  sm: 'h-9 w-9 text-xs',
  md: 'h-16 w-16 text-sm',
  lg: 'h-24 w-24 text-lg',
  xl: 'h-28 w-28 text-xl',
}[props.size] || 'h-9 w-9 text-xs'))

const initials = computed(() => {
  const name = props.name || 'U'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

watch(() => props.photoUrl, () => {
  broken.value = false
})
</script>
