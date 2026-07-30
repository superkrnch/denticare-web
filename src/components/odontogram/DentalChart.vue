<template>
  <div class="select-none space-y-7">
    <section v-for="jaw in jaws" :key="jaw.label">
      <p
        v-if="jaw.pos === 'top'"
        class="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500"
      >
        {{ jaw.label }}
      </p>

      <div class="flex items-start justify-center gap-3 sm:gap-5">
        <div
          v-for="(group, gi) in jaw.groups"
          :key="gi"
          class="flex gap-1 sm:gap-1.5"
        >
          <button
            v-for="num in group"
            :key="num"
            type="button"
            class="flex h-12 w-9 flex-col items-center justify-center rounded-md border transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus:outline-none"
            :class="[
              toothClass(num),
              isSelected(num) ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : '',
            ]"
            :title="toothTitle(num)"
            @click="$emit('select', num)"
          >
            <span class="text-[11px] font-bold leading-tight tabular-nums">{{ num }}</span>
            <span class="text-[9px] font-semibold uppercase leading-tight tracking-tight opacity-70">
              {{ abbr(num) }}
            </span>
          </button>
        </div>
      </div>

      <p
        v-if="jaw.pos === 'bottom'"
        class="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500"
      >
        {{ jaw.label }}
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  TOOTH_NUMBERS,
  TOOTH_NUMBERS_CHILD,
  TOOTH_STATUS_COLORS,
  TOOTH_STATUS_ABBR,
  TOOTH_STATUS_LABELS,
} from '@/constants'

const props = defineProps({
  teeth: { type: Object, default: () => ({}) },
  selected: { type: [Number, String, Array], default: null },
  mode: { type: String, default: 'adult' },
})

defineEmits(['select'])

function isSelected(num) {
  const sel = props.selected
  if (Array.isArray(sel)) return sel.map(Number).includes(Number(num))
  return Number(sel) === Number(num)
}

const jaws = computed(() => {
  const nums = props.mode === 'child' ? TOOTH_NUMBERS_CHILD : TOOTH_NUMBERS
  const q = nums.length / 4
  return [
    { label: 'Upper Jaw', pos: 'top', groups: [nums.slice(0, q), nums.slice(q, q * 2)] },
    { label: 'Lower Jaw', pos: 'bottom', groups: [nums.slice(q * 2, q * 3), nums.slice(q * 3, q * 4)] },
  ]
})

function toothStatus(num) {
  return props.teeth?.[num]?.status || 'healthy'
}

function toothClass(num) {
  return TOOTH_STATUS_COLORS[toothStatus(num)] || TOOTH_STATUS_COLORS.healthy
}

function abbr(num) {
  return TOOTH_STATUS_ABBR[toothStatus(num)] || 'H'
}

function toothTitle(num) {
  const status = toothStatus(num)
  const tooth = props.teeth?.[num]
  const label = TOOTH_STATUS_LABELS[status] || 'Healthy'
  return `Tooth #${num} — ${label}${tooth?.treatment ? ` · ${tooth.treatment}` : ''}`
}
</script>
