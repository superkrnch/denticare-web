<template>
  <div
    class="flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800"
    :class="containerClass"
  >
    <img
      v-if="src && !broken"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      :class="imageClass"
      @error="broken = true"
    />
    <div v-else class="flex flex-col items-center gap-2 p-4 text-center">
      <ImageOff class="h-8 w-8 text-slate-400" :stroke-width="1.5" />
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ message }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ImageOff } from '@lucide/vue'

const props = defineProps({
  xray: { type: Object, required: true },
  src: { type: String, default: '' },
  alt: { type: String, default: 'X-ray' },
  containerClass: { type: String, default: 'h-48' },
  imageClass: { type: String, default: '' },
  missing: { type: Boolean, default: false },
})

const broken = ref(false)

const message = computed(() => {
  if (props.missing) return 'Image unavailable — delete and re-upload'
  return 'Image unavailable'
})

watch(() => [props.xray?.id, props.src], () => {
  broken.value = false
})
</script>
