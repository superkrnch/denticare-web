import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePatientsStore } from './patients'
import { useAppointmentsStore } from './appointments'
import { useQueueStore } from './queue'
import { useBillingStore } from './billing'
import { useTreatmentsStore } from './treatments'
import { APPOINTMENT_STATUS } from '@/constants'
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(false)

  const stats = computed(() => {
    const patients = usePatientsStore()
    const appointments = useAppointmentsStore()
    const queue = useQueueStore()
    const billing = useBillingStore()

    const todayAppts = appointments.getTodayAppointments()
    return {
      totalPatients: patients.patients.filter((p) => !p.archived).length,
      todayAppointments: todayAppts.length,
      pendingAppointments: appointments.filterByStatus(APPOINTMENT_STATUS.PENDING).length,
      completedAppointments: appointments.filterByStatus(APPOINTMENT_STATUS.COMPLETED).length,
      activeQueue: queue.totalWaiting(),
      monthlyRevenue: billing.getMonthlyRevenue(),
    }
  })

  function monthlyAppointmentData() {
    const appointments = useAppointmentsStore()
    const end = new Date()
    const start = subMonths(end, 5)
    const months = eachMonthOfInterval({ start, end })

    return months.map((month) => {
      const label = format(month, 'MMM yyyy')
      const count = appointments.appointments.filter((a) => {
        if (!a.date) return false
        const d = new Date(a.date)
        return d >= startOfMonth(month) && d <= endOfMonth(month)
      }).length
      return { label, count }
    })
  }

  function revenueSummaryData() {
    const billing = useBillingStore()
    const end = new Date()
    const start = subMonths(end, 5)
    const months = eachMonthOfInterval({ start, end })

    return months.map((month) => {
      const label = format(month, 'MMM')
      const revenue = billing.billings
        .filter((b) => {
          const d = b.createdAt?.toDate?.() || new Date(b.createdAt)
          return d >= startOfMonth(month) && d <= endOfMonth(month)
        })
        .reduce((sum, b) => sum + (b.paidAmount || 0), 0)
      return { label, revenue }
    })
  }

  function commonTreatmentsData() {
    const treatments = useTreatmentsStore()
    return treatments.getCommonTreatments()
  }

  async function loadDashboardData() {
    loading.value = true
    const patients = usePatientsStore()
    const appointments = useAppointmentsStore()
    const billing = useBillingStore()
    const treatments = useTreatmentsStore()

    await Promise.all([
      patients.fetchPatients(),
      appointments.fetchAppointments(),
      billing.fetchBillings(),
      treatments.fetchAll(),
    ])
    loading.value = false
  }

  return {
    loading, stats, monthlyAppointmentData, revenueSummaryData,
    commonTreatmentsData, loadDashboardData,
  }
})
