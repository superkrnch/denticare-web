<template>
  <div>
    <div class="mb-4 flex flex-col gap-3 sm:flex-row">
      <select v-model="selectedPatientId" class="input max-w-md" @change="loadXrays">
        <option value="">Select patient...</option>
        <option v-for="p in patientList" :key="p.id" :value="p.id">{{ fullName(p) }}</option>
      </select>
      <button v-if="selectedPatientId" class="btn-primary" @click="showUpload = true">+ Upload X-Ray</button>
    </div>

    <div v-if="selectedPatientId">
      <div v-if="xrays.xrays.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="xray in xrays.xrays" :key="xray.id" class="card overflow-hidden">
          <div class="cursor-pointer" @click="previewXray = xray">
            <XrayImage
              :xray="xray"
              :src="xrays.getImageUrl(xray)"
              :missing="xrays.isImageMissing(xray)"
              :alt="xray.xrayType"
              container-class="h-48"
            />
          </div>
          <div class="p-4">
            <p class="font-medium capitalize">{{ xray.xrayType }}</p>
            <p class="text-xs text-slate-500">{{ xray.dentistName }} · {{ formatDate(xray.uploadDate) }}</p>
            <p v-if="xrays.isImageMissing(xray)" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Image unavailable — delete and re-upload.
            </p>
            <p v-if="xray.notes" class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ xray.notes }}</p>
            <div class="mt-3 flex gap-2">
              <a
                v-if="xrays.getImageUrl(xray)"
                :href="xrays.getImageUrl(xray)"
                :download="getXrayDownloadName(xray)"
                target="_blank"
                rel="noopener"
                class="btn-secondary px-2 py-1 text-xs"
              >Download</a>
              <button class="btn-danger px-2 py-1 text-xs" @click="handleDelete(xray)">Delete</button>
            </div>
          </div>
        </div>
      </div>
      <EmptyState v-else title="No X-rays uploaded" description="Upload the first image for this patient." :icon="ScanLine" />
    </div>
    <EmptyState
      v-else
      title="Select a patient"
      description="Choose a patient to manage their X-ray records."
      :icon="ScanLine"
    />

    <BaseModal :show="showUpload" title="Upload X-Ray" @close="closeUpload">
      <form class="space-y-4" @submit.prevent="handleUpload">
        <div>
          <label class="label">X-Ray Type *</label>
          <select v-model="uploadForm.xrayType" class="input" required>
            <option v-for="t in xrayTypes" :key="t" :value="t" class="capitalize">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="label">Image File *</label>
          <input type="file" accept="image/*" class="input" required @change="onFileChange" />
          <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Images are automatically compressed to a maximum of 2MB before upload.
          </p>

          <div v-if="compressing" class="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <LoaderCircle class="h-4 w-4 animate-spin" :stroke-width="1.75" />
            Compressing image to 2MB max...
          </div>

          <div
            v-else-if="compressionInfo"
            class="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="text-slate-500 dark:text-slate-400">Original</span>
              <span class="font-medium text-slate-800 dark:text-slate-100">{{ formatFileSize(compressionInfo.originalSize) }}</span>
            </div>
            <div class="mt-1 flex items-center justify-between gap-3">
              <span class="text-slate-500 dark:text-slate-400">Compressed</span>
              <span class="font-medium text-primary-700 dark:text-primary-300">{{ formatFileSize(compressionInfo.compressedSize) }}</span>
            </div>
            <p v-if="compressionInfo.wasCompressed" class="mt-2 text-xs text-teal-700 dark:text-teal-300">
              Ready to upload — under the 2MB limit.
            </p>
          </div>

          <p v-if="compressionError" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ compressionError }}</p>
        </div>
        <div>
          <label class="label">Notes</label>
          <textarea v-model="uploadForm.notes" class="input" rows="2" />
        </div>
        <button type="submit" class="btn-primary w-full" :disabled="uploading || compressing || !compressedFile">
          {{ uploading ? 'Uploading...' : compressing ? 'Compressing...' : 'Upload X-Ray' }}
        </button>
      </form>
    </BaseModal>

    <BaseModal :show="!!previewXray" title="X-Ray Preview" size="xl" @close="previewXray = null">
      <XrayImage
        v-if="previewXray"
        :xray="previewXray"
        :src="xrays.getImageUrl(previewXray)"
        :missing="xrays.isImageMissing(previewXray)"
        container-class="min-h-[20rem] rounded-lg"
      />
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ScanLine, LoaderCircle } from '@lucide/vue'
import { usePatientsStore } from '@/stores/patients'
import { useXraysStore } from '@/stores/xrays'
import { useToastStore } from '@/stores/toast'
import { XRAY_TYPES } from '@/constants'
import { fullName, formatDate } from '@/utils/helpers'
import { getXrayDownloadName } from '@/utils/xrayImage'
import { compressXrayImage, formatFileSize } from '@/utils/imageCompression'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import XrayImage from '@/components/xrays/XrayImage.vue'

const patients = usePatientsStore()
const xrays = useXraysStore()
const toast = useToastStore()

const selectedPatientId = ref('')
const showUpload = ref(false)
const previewXray = ref(null)
const uploading = ref(false)
const compressing = ref(false)
const file = ref(null)
const compressedFile = ref(null)
const compressionInfo = ref(null)
const compressionError = ref('')
const uploadForm = ref({ xrayType: 'panoramic', notes: '' })
const xrayTypes = XRAY_TYPES
const patientList = computed(() => patients.patients.filter((p) => !p.archived))

onMounted(() => patients.fetchPatients())

async function loadXrays() {
  if (selectedPatientId.value) await xrays.fetchByPatient(selectedPatientId.value)
}

function resetUploadForm() {
  file.value = null
  compressedFile.value = null
  compressionInfo.value = null
  compressionError.value = ''
  uploadForm.value = { xrayType: 'panoramic', notes: '' }
}

function closeUpload() {
  showUpload.value = false
  resetUploadForm()
}

async function onFileChange(e) {
  const selected = e.target.files?.[0]
  file.value = selected || null
  compressedFile.value = null
  compressionInfo.value = null
  compressionError.value = ''

  if (!selected) return

  compressing.value = true
  try {
    const result = await compressXrayImage(selected)
    compressedFile.value = result.file
    compressionInfo.value = result
  } catch (err) {
    compressionError.value = err.message
    e.target.value = ''
    file.value = null
  } finally {
    compressing.value = false
  }
}

async function handleUpload() {
  if (!compressedFile.value) return
  uploading.value = true
  try {
    await xrays.uploadXray(selectedPatientId.value, compressedFile.value, uploadForm.value)
    await xrays.fetchByPatient(selectedPatientId.value)
    const saved = compressionInfo.value?.wasCompressed ? ' (compressed to 2MB)' : ''
    toast.success(`X-ray uploaded to cloud storage${saved}.`)
    closeUpload()
  } catch (e) {
    toast.error(e.message)
  } finally {
    uploading.value = false
  }
}

async function handleDelete(xray) {
  if (!confirm('Delete this X-ray?')) return
  await xrays.deleteXray(xray)
  toast.success('X-ray deleted.')
}
</script>
