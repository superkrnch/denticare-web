import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'

export function useChartTheme() {
  const { isDark } = storeToRefs(useThemeStore())

  const gridColor = computed(() => (isDark.value ? '#334155' : '#f1f5f9'))
  const tickColor = computed(() => (isDark.value ? '#94a3b8' : '#64748b'))
  const legendColor = computed(() => (isDark.value ? '#cbd5e1' : '#475569'))

  const scaleOptions = computed(() => ({
    y: {
      beginAtZero: true,
      grid: { color: gridColor.value },
      ticks: { color: tickColor.value },
    },
    x: {
      grid: { display: false },
      ticks: { color: tickColor.value },
    },
  }))

  const legendOptions = computed(() => ({
    position: 'bottom',
    labels: { color: legendColor.value },
  }))

  return { gridColor, tickColor, legendColor, scaleOptions, legendOptions }
}
