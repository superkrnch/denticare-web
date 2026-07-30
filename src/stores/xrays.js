import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDocs, addDoc, deleteDoc, query,
  where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/firebase/config'
import { COLLECTIONS } from '@/constants'
import { compressXrayImage, XRAY_MAX_SIZE_BYTES, formatFileSize } from '@/utils/imageCompression'
import {
  getLocalXrayImage,
  deleteLocalXrayImage,
  createObjectUrl,
  revokeObjectUrl,
} from '@/utils/localXrayStorage'
import { useAuthStore } from './auth'
import { useActivityStore } from './activities'

export const useXraysStore = defineStore('xrays', () => {
  const xrays = ref([])
  const localImageUrls = ref({})
  const loading = ref(false)

  function clearLocalImageUrls() {
    Object.values(localImageUrls.value).forEach(revokeObjectUrl)
    localImageUrls.value = {}
  }

  async function hydrateLocalImages(items) {
    clearLocalImageUrls()
    const next = {}

    await Promise.all(
      items
        .filter((xray) => xray.storageType === 'local' && !xray.fileUrl && !xray.imageData)
        .map(async (xray) => {
          const blob = await getLocalXrayImage(xray.id)
          if (blob) next[xray.id] = createObjectUrl(blob)
        }),
    )

    localImageUrls.value = next
  }

  function getImageUrl(xray) {
    if (!xray) return ''
    if (xray.fileUrl) return xray.fileUrl
    if (xray.imageData) return xray.imageData
    return localImageUrls.value[xray.id] || ''
  }

  function isImageMissing(xray) {
    return Boolean(xray) && !getImageUrl(xray)
  }

  async function fetchByPatient(patientId) {
    loading.value = true
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.XRAYS), where('patientId', '==', patientId), orderBy('uploadDate', 'desc')),
      )
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      xrays.value = items
      await hydrateLocalImages(items)
    } finally {
      loading.value = false
    }
  }

  async function uploadXray(patientId, file, { xrayType, notes }) {
    const auth = useAuthStore()
    const activities = useActivityStore()
    const compressed = file.size <= XRAY_MAX_SIZE_BYTES
      ? file
      : (await compressXrayImage(file)).file

    if (compressed.size > XRAY_MAX_SIZE_BYTES) {
      throw new Error(`Image must be ${formatFileSize(XRAY_MAX_SIZE_BYTES)} or smaller after compression.`)
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `xrays/${patientId}/${Date.now()}_${safeName}`
    const fileRef = storageRef(storage, path)

    await uploadBytes(fileRef, compressed, { contentType: compressed.type || 'image/jpeg' })
    const fileUrl = await getDownloadURL(fileRef)

    const docRef = await addDoc(collection(db, COLLECTIONS.XRAYS), {
      patientId,
      xrayType,
      notes: notes || '',
      fileUrl,
      filePath: path,
      fileName: file.name,
      mimeType: compressed.type || 'image/jpeg',
      fileSize: compressed.size,
      storageType: 'cloud',
      dentistId: auth.user?.uid,
      dentistName: auth.displayName,
      uploadDate: serverTimestamp(),
    })

    await activities.log('xray', `Uploaded ${xrayType} x-ray`, { patientId })
    return docRef.id
  }

  async function deleteXray(xray) {
    const activities = useActivityStore()

    if (xray.filePath) {
      try {
        await deleteObject(storageRef(storage, xray.filePath))
      } catch {
        // file may already be deleted
      }
    }

    if (xray.storageType === 'local') {
      await deleteLocalXrayImage(xray.id)
      if (localImageUrls.value[xray.id]) {
        revokeObjectUrl(localImageUrls.value[xray.id])
        const { [xray.id]: _, ...rest } = localImageUrls.value
        localImageUrls.value = rest
      }
    }

    await deleteDoc(doc(db, COLLECTIONS.XRAYS, xray.id))
    xrays.value = xrays.value.filter((x) => x.id !== xray.id)
    await activities.log('xray', 'Deleted x-ray record', { patientId: xray.patientId })
  }

  return {
    xrays,
    loading,
    fetchByPatient,
    uploadXray,
    deleteXray,
    getImageUrl,
    isImageMissing,
  }
})
