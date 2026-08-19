<template>
  <div class="relative inline-block w-full" ref="root">
    <button type="button" class="input w-full text-left" @click="toggle" :aria-expanded="open">
      <span>{{ selectedLabel || placeholder }}</span>
      <span class="float-right">▾</span>
    </button>

    <div v-if="open" class="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg" :style="dropdownStyle">
      <div class="max-h-56 overflow-auto" role="listbox">
        <div v-for="item in items" :key="getValue(item)" class="px-3 py-2 hover:bg-slate-100 cursor-pointer" @click="select(item)" role="option">
          <slot name="item" :item="item">{{ getLabel(item) }}</slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useClickAway } from '@/composables/useClickAway'

const props = defineProps({
  items: { type: Array, default: () => [] },
  modelValue: { required: false },
  labelField: { type: String, default: 'name' },
  valueField: { type: String, default: 'id' },
  placeholder: { type: String, default: 'Select' },
  maxHeight: { type: String, default: '14rem' },
})

const emit = defineEmits(['update:modelValue'])
const root = ref(null)
const open = ref(false)

function toggle() { open.value = !open.value }

function getLabel(item) {
  if (!item) return ''
  return typeof item === 'string' ? item : (item[props.labelField] ?? '')
}

function getValue(item) {
  return typeof item === 'string' ? item : (item[props.valueField] ?? getLabel(item))
}

const selectedLabel = computed(() => {
  if (props.modelValue == null) return ''
  const found = props.items.find((i) => getValue(i) === props.modelValue)
  return found ? getLabel(found) : String(props.modelValue)
})

function select(item) {
  emit('update:modelValue', getValue(item))
  open.value = false
}

const dropdownStyle = computed(() => ({ maxHeight: props.maxHeight }))

// close on outside click
onMounted(() => useClickAway(root, () => { open.value = false }))

onBeforeUnmount(() => { open.value = false })
</script>

<style scoped>
.input { padding: 0.5rem 0.75rem; border: 1px solid var(--tw-border-opacity, #e5e7eb); border-radius: 0.375rem; background: transparent }
</style>
