<template>
  <div class="h-64">
    <Doughnut v-if="chartData" :data="chartData" :options="options" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useChartTheme } from '@/composables/useChartTheme'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  labels: Array,
  data: Array,
})

const { legendOptions } = useChartTheme()

const colors = ['#2563eb', '#0d9488', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    data: props.data,
    backgroundColor: colors.slice(0, props.data.length),
  }],
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: legendOptions.value },
}))
</script>
