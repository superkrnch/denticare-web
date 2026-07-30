<template>
  <div class="h-64">
    <Line v-if="chartData" :data="chartData" :options="options" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { useChartTheme } from '@/composables/useChartTheme'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps({
  labels: Array,
  data: Array,
  label: { type: String, default: 'Data' },
  color: { type: String, default: '#2563eb' },
})

const { scaleOptions } = useChartTheme()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    label: props.label,
    data: props.data,
    borderColor: props.color,
    backgroundColor: `${props.color}20`,
    fill: true,
    tension: 0.4,
  }],
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: scaleOptions.value,
}))
</script>
