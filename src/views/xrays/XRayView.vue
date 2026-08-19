<template>
  <div>
    <div class="mb-4">
      <div class="mb-2">
        <label class="label">Recently added</label>
        <div class="flex gap-2 flex-wrap items-center">
          <button v-for="p in recentPatients" :key="p.id" class="btn-secondary px-2 py-1 text-xs" @click="selectRecent(p.id)">
            {{ fullName(p) }}
          </button>
          <span v-if="!recentPatients.length" class="text-sm text-slate-500">No recent patients</span>
        </div>
      </div>

      <div class="flex gap-3">
        <select v-model="selectedPatientId" class="input max-w-md" @change="loadXrays">
          <option value="">Select patient...</option>
          <option v-for="p in patientList" :key="p.id" :value="p.id">{{ fullName(p) }}</option>
        </select>
        <button v-if="selectedPatientId" class="btn-primary" @click="showUpload = true">+ Upload X-Ray</button>
      </div>
    </div>

    <!-- ALL PATIENTS GALLERY (front page) -->
    <div class="mb-6">
      <div class="mb-2 flex items-center justify-between">
        <h3 class="section-title mb-0">All Patients - X-Ray Gallery</h3>
        <div class="flex items-center gap-4">
          <!-- simplified control: show label when global, button to return to global when viewing a patient's xrays -->
          <template v-if="showGlobalGallery">
            <button
              type="button"
              class="btn-secondary text-sm"
              :disabled="!selectedPatientId"
              @click="switchToPatientView"
            >
              Show only selected patient's X-Rays
            </button>
          </template>
          <template v-else>
            <button type="button" class="btn-secondary text-sm" @click="showGlobalGallery = true">Show all patients</button>
          </template>
        </div>
      </div>

      <div v-if="displayedGalleryXrays.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="xray in displayedGalleryXrays" :key="xray.id" class="card overflow-hidden">
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
            <p class="text-xs text-slate-500">{{ getPatientFullName(xray.patientId) }} · {{ xray.dentistName }} · {{ formatDate(xray.uploadDate) }}</p>
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
      <EmptyState v-else title="No X-rays available" description="No X-rays found for any patient." :icon="ScanLine" />
    </div>

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
import { ref, computed, onMounted, watch } from 'vue'
import { collection, query as q, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { ScanLine, LoaderCircle } from '@lucide/vue'
import { COLLECTIONS } from '@/constants'
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
const recentPatients = computed(() => {
  return patients.patients
    .filter((p) => !p.archived && p.createdAt)
    .sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()
      const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()
      return tb - ta
    })
    .slice(0, 5)
})

const recentThumbnails = ref({})
// toggle to show global gallery (all patients). Default: true
const showGlobalGallery = ref(true)
const allXrays = ref([])

const displayedXrays = computed(() => xrays.xrays || [])

const displayedGalleryXrays = computed(() => {
  if (showGlobalGallery.value) return allXrays.value || []
  // when global gallery is off, show selected patient's xrays (if any)
  return selectedPatientId.value ? (xrays.xrays || []) : []
})

async function fetchAllXrays() {
  try {
    const snap = await getDocs(q(collection(db, COLLECTIONS.XRAYS), orderBy('uploadDate', 'desc')))
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    allXrays.value = items.filter((x) => !x.archived)
  } catch (e) {
    console.error('Failed to load all xrays', e)
    allXrays.value = []
  }
}

watch(showGlobalGallery, (v) => {
  if (v) fetchAllXrays()
  else if (selectedPatientId.value) loadXrays()
})

async function loadRecentThumbnails() {
  const list = recentPatients.value || []
  const map = {}
  await Promise.all(list.map(async (p) => {
    try {
      const qr = q(collection(db, 'xrays'), where('patientId', '==', p.id), orderBy('uploadDate', 'desc'), limit(1))
      const snap = await getDocs(qr)
      if (!snap.empty) {
        const d = snap.docs[0].data()
        map[p.id] = d.fileUrl || ''
      }
    } catch {
      // ignore per-patient thumbnail errors
    }
  }))
  recentThumbnails.value = map
}

onMounted(async () => {
  await patients.fetchPatients()
  loadRecentThumbnails()
  // fetch all xrays by default for front-page gallery
  await fetchAllXrays()
})

async function loadXrays() {
  if (selectedPatientId.value) await xrays.fetchByPatient(selectedPatientId.value)
}

async function selectRecent(id) {
  selectedPatientId.value = id
  await loadXrays()
}

// When a patient is selected, switch the gallery to show only that patient's X-rays
watch(selectedPatientId, (id) => {
  if (id) showGlobalGallery.value = false
})

function switchToPatientView() {
  if (!selectedPatientId.value) {
    toast.info('Select a patient first to view their X-rays.')
    return
  }
  showGlobalGallery.value = false
  loadXrays()
}

const selectedPatient = computed(() => patients.patients.find((p) => p.id === selectedPatientId.value) || null)
const selectedPatientInitials = computed(() => {
  const p = selectedPatient.value
  if (!p) return ''
  const parts = [p.firstName, p.lastName].filter(Boolean)
  return parts.map((s) => s[0]?.toUpperCase() ?? '').join('').slice(0, 2)
})

function getPatientFullName(id) {
  const p = patients.patients.find((x) => x.id === id)
  return p ? fullName(p) : 'Unknown'
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
