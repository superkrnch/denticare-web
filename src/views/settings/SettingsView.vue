<template>
  <div>
    <LoadingSpinner :show="settings.loading" />

    <div v-if="!settings.loading" class="mx-auto max-w-3xl space-y-6">
      <div class="card p-6">
        <div class="mb-5 flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-300">
            <CalendarClock class="h-5 w-5" :stroke-width="1.75" />
          </div>
          <div>
            <h2 class="font-semibold text-slate-800 dark:text-slate-100">Weekly schedule</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Patients and staff will see when you are available for booking.
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="day in WEEKDAYS"
            :key="day.key"
            class="flex flex-col gap-3 rounded-xl border border-slate-200/80 p-4 text-sm transition-colors dark:border-slate-800 sm:flex-row sm:items-center"
            :class="form[day.key].closed ? 'bg-slate-50/80 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900'"
          >
            <span class="w-28 font-medium text-slate-800 dark:text-slate-100">{{ day.label }}</span>

            <label class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <input
                v-model="form[day.key].closed"
                type="checkbox"
                class="rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
              />
              Not available
            </label>

            <div class="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
              <input
                v-model="form[day.key].open"
                type="time"
                class="input w-32"
                :disabled="form[day.key].closed"
              />
              <span class="text-slate-400">to</span>
              <input
                v-model="form[day.key].close"
                type="time"
                class="input w-32"
                :disabled="form[day.key].closed"
              />
            </div>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <button type="button" class="btn-primary" :disabled="settings.saving" @click="saveAvailability">
            <LoaderCircle v-if="settings.saving" class="h-4 w-4 animate-spin" :stroke-width="1.75" />
            {{ settings.saving ? 'Saving...' : 'Save availability' }}
          </button>
          <button type="button" class="btn-secondary" :disabled="settings.saving" @click="resetForm">
            Reset changes
          </button>
        </div>
      </div>

      <div class="card p-6">
        <h2 class="mb-3 font-semibold text-slate-800 dark:text-slate-100">Quick summary</h2>
        <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li v-for="day in WEEKDAYS" :key="`${day.key}-summary`" class="flex justify-between gap-4">
            <span class="font-medium">{{ day.label }}</span>
            <span class="text-right text-slate-500 dark:text-slate-400">
              {{ summaryForDay(day.key) }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { CalendarClock, LoaderCircle } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import { WEEKDAYS, normalizeAvailability } from '@/utils/availability'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const auth = useAuthStore()
const settings = useSettingsStore()
const toast = useToastStore()

const form = ref(normalizeAvailability())

onMounted(async () => {
  if (!auth.user?.uid) return
  await settings.loadDentistAvailability(auth.user.uid)
  form.value = normalizeAvailability(settings.availability)
})

function resetForm() {
  form.value = normalizeAvailability(settings.availability)
}

function summaryForDay(dayKey) {
  const day = form.value[dayKey]
  if (!day || day.closed) return 'Not available'
  if (!day.open || !day.close) return 'Not available'
  return `${day.open} – ${day.close}`
}

function validateForm() {
  for (const day of WEEKDAYS) {
    const hours = form.value[day.key]
    if (hours.closed) continue
    if (!hours.open || !hours.close) {
      throw new Error(`Please set open and close times for ${day.label}, or mark it as not available.`)
    }
    if (hours.open >= hours.close) {
      throw new Error(`${day.label}: close time must be after open time.`)
    }
  }
}

async function saveAvailability() {
  try {
    validateForm()
    await settings.saveDentistAvailability(auth.user.uid, form.value)
    await auth.loadProfile(auth.user.uid)
    toast.success('Your availability has been saved.')
  } catch (e) {
    toast.error(e.message)
  }
}
</script>
