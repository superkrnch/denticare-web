<template>
  <div class="page-scroll-layout w-full">
    <div class="page-header shrink-0">
      <router-link to="/treatments" class="btn-secondary sm:ml-auto">
        <ArrowLeft class="h-4 w-4" :stroke-width="1.75" />
        Back to Treatments
      </router-link>
    </div>

    <div class="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        class="flex items-start gap-4 border-b border-slate-200/70 bg-slate-50/60 px-6 py-5 lg:px-8 lg:py-6 dark:border-slate-800 dark:bg-slate-800/30"
      >
        <span
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-300"
        >
          <Stethoscope class="h-6 w-6" :stroke-width="1.75" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-lg font-semibold text-slate-800 dark:text-slate-100">Quick treatment presets</p>
          <p class="mt-1 text-sm text-slate-500 lg:text-base dark:text-slate-400">
            These procedures appear as one-tap options when creating appointments and treatment plans.
          </p>
        </div>
        <span
          class="ml-auto hidden shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 sm:inline-block dark:bg-slate-800 dark:text-slate-300"
        >
          {{ presets.length }} {{ presets.length === 1 ? 'preset' : 'presets' }}
        </span>
      </div>

      <div class="flex min-h-0 flex-1 flex-col p-6 lg:p-8">
        <div
          v-if="presets.length"
          class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/80"
        >
          <div class="min-h-0 flex-1 overflow-y-auto">
            <div
              class="sticky top-0 z-10 hidden grid-cols-12 items-center gap-5 border-b border-slate-200 bg-slate-50 px-5 py-3.5 sm:grid lg:px-6 dark:border-slate-700 dark:bg-slate-800/70"
            >
              <span class="section-title col-span-1">#</span>
              <span class="section-title col-span-3">Procedure</span>
              <span class="section-title col-span-2">Default cost</span>
              <span class="section-title col-span-5">Default notes</span>
              <span class="col-span-1"></span>
            </div>

            <div class="divide-y divide-slate-200 dark:divide-slate-800">
              <div
                v-for="(preset, index) in presets"
                :key="index"
                class="grid grid-cols-1 gap-4 px-5 py-4 transition-colors hover:bg-slate-50 sm:grid-cols-12 sm:items-center sm:gap-5 lg:px-6 dark:hover:bg-slate-800/40"
              >
                <div class="hidden sm:col-span-1 sm:flex sm:items-center">
                  <span class="text-base font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                    {{ index + 1 }}
                  </span>
                </div>
                <div class="sm:col-span-3">
                  <label class="label sm:hidden">Procedure</label>
                  <input v-model="preset.name" class="input text-base" placeholder="e.g. Cleaning" />
                </div>
                <div class="sm:col-span-2">
                  <label class="label sm:hidden">Default cost (PHP)</label>
                  <div class="relative">
                    <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-slate-400">₱</span>
                    <input v-model.number="preset.defaultCost" type="number" min="0" step="0.01" class="input pl-8 text-base" />
                  </div>
                </div>
                <div class="sm:col-span-5">
                  <label class="label sm:hidden">Default notes</label>
                  <input v-model="preset.defaultNotes" class="input text-base" placeholder="Optional notes for this procedure" />
                </div>
                <div class="flex justify-end sm:col-span-1">
                  <button
                    type="button"
                    class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    title="Remove procedure"
                    @click="removePreset(index)"
                  >
                    <Trash2 class="h-5 w-5" :stroke-width="1.75" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700"
        >
          <span
            class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
          >
            <Stethoscope class="h-5 w-5" :stroke-width="1.75" />
          </span>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-200">No presets yet</p>
          <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Add your common procedures to speed up creating treatment plans.
          </p>
        </div>

        <div class="mt-6 flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200/70 pt-6 dark:border-slate-800">
          <button type="button" class="btn-secondary px-5 py-3 text-base" @click="addPreset">
            <Plus class="h-5 w-5" :stroke-width="1.75" />
            Add procedure
          </button>
          <button type="button" class="btn-primary px-6 py-3 text-base sm:ml-auto" :disabled="saving" @click="save">
            <LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" :stroke-width="1.75" />
            <Save v-else class="h-4 w-4" :stroke-width="1.75" />
            {{ saving ? 'Saving…' : 'Save presets' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ArrowLeft, LoaderCircle, Plus, Save, Stethoscope, Trash2 } from '@lucide/vue'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'

const settings = useSettingsStore()
const toast = useToastStore()

const presets = ref([])
const saving = ref(false)

onMounted(async () => {
  const items = await settings.loadTreatmentTemplates()
  presets.value = items.map((t) => ({ ...t }))
})

function addPreset() {
  presets.value.push({ name: '', defaultCost: 0, defaultNotes: '' })
}

function removePreset(index) {
  presets.value.splice(index, 1)
}

async function save() {
  const cleaned = presets.value.filter((p) => p.name && p.name.trim())
  if (!cleaned.length) {
    toast.error('Add at least one procedure preset.')
    return
  }
  saving.value = true
  try {
    await settings.saveTreatmentTemplates(cleaned)
    presets.value = settings.treatmentTemplates.map((t) => ({ ...t }))
    toast.success('Procedure presets saved.')
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}
</script>
