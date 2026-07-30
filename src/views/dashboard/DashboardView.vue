<template>
  <div>
    <LoadingSpinner :show="dashboard.loading" />

    <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        title="Total Patients"
        :value="stats.totalPatients"
        :icon="Users"
        icon-bg="bg-blue-50 dark:bg-blue-950/50"
        icon-color="text-blue-600"
      />
      <StatCard
        title="Today's Appointments"
        :value="stats.todayAppointments"
        :icon="CalendarDays"
        icon-bg="bg-teal-50 dark:bg-teal-950/50"
        icon-color="text-teal-600"
      />
      <StatCard
        title="Pending Appointments"
        :value="stats.pendingAppointments"
        :icon="Clock3"
        icon-bg="bg-amber-50 dark:bg-amber-950/50"
        icon-color="text-amber-600"
      />
      <StatCard
        title="Completed Today"
        :value="stats.completedAppointments"
        :icon="CheckCircle2"
        icon-bg="bg-emerald-50 dark:bg-emerald-950/50"
        icon-color="text-emerald-600"
      />
      <StatCard
        title="Active Queue"
        :value="stats.activeQueue"
        :icon="ListOrdered"
        icon-bg="bg-violet-50 dark:bg-violet-950/50"
        icon-color="text-violet-600"
      />
      <StatCard
        title="Monthly Revenue"
        :value="formatCurrency(stats.monthlyRevenue)"
        :icon="Wallet"
        icon-bg="bg-primary-50 dark:bg-primary-950/50"
        icon-color="text-primary-600"
      />
    </div>

    <div class="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="card p-6">
        <h3 class="section-title mb-5">Monthly appointments</h3>
        <LineChart
          :labels="monthlyAppts.map((d) => d.label)"
          :data="monthlyAppts.map((d) => d.count)"
          label="Appointments"
        />
      </div>
      <div class="card p-6">
        <h3 class="section-title mb-5">Revenue summary</h3>
        <BarChart
          :labels="revenueData.map((d) => d.label)"
          :data="revenueData.map((d) => d.revenue)"
          label="Revenue (PHP)"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="card p-6">
        <h3 class="section-title mb-5">Common treatments</h3>
        <DoughnutChart
          v-if="treatmentData.length"
          :labels="treatmentData.map((d) => d.name)"
          :data="treatmentData.map((d) => d.count)"
        />
        <EmptyState
          v-else
          title="No treatment data yet"
          description="Treatment stats will appear once you add treatment plans."
          :icon="Pill"
        />
      </div>
      <div class="card p-6">
        <h3 class="section-title mb-5">Recent activity</h3>
        <div v-if="activities.recent.length" class="max-h-80 space-y-1 overflow-y-auto pr-1">
          <div
            v-for="act in activities.recent"
            :key="act.id"
            class="flex items-start gap-3 rounded-xl p-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Activity class="h-4 w-4" :stroke-width="1.75" />
            </div>
            <div class="min-w-0">
              <p class="text-slate-700">{{ act.description }}</p>
              <p class="mt-0.5 text-xs text-slate-400">{{ act.userName }} · {{ formatDate(act.createdAt) }}</p>
            </div>
          </div>
        </div>
        <EmptyState
          v-else
          title="No recent activity"
          description="Actions from your team will show up here."
          :icon="Activity"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListOrdered,
  Pill,
  Users,
  Wallet,
} from '@lucide/vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useActivityStore } from '@/stores/activities'
import { formatCurrency, formatDate } from '@/utils/helpers'
import StatCard from '@/components/common/StatCard.vue'
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const dashboard = useDashboardStore()
const activities = useActivityStore()
let unsub = null

const stats = computed(() => dashboard.stats)
const monthlyAppts = computed(() => dashboard.monthlyAppointmentData())
const revenueData = computed(() => dashboard.revenueSummaryData())
const treatmentData = computed(() => dashboard.commonTreatmentsData())

onMounted(async () => {
  await dashboard.loadDashboardData()
  unsub = activities.subscribeRecent(10)
})

onUnmounted(() => {
  if (unsub) unsub()
})
</script>
