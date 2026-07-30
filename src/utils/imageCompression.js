import imageCompression from 'browser-image-compression'

export const XRAY_MAX_SIZE_MB = 2
export const XRAY_MAX_SIZE_BYTES = XRAY_MAX_SIZE_MB * 1024 * 1024

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const PROFILE_MAX_SIZE_MB = 1
export const PROFILE_MAX_SIZE_BYTES = PROFILE_MAX_SIZE_MB * 1024 * 1024

export async function compressProfileImage(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Please select a valid image file.')
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: PROFILE_MAX_SIZE_MB,
      maxWidthOrHeight: 512,
      useWebWorker: true,
      initialQuality: 0.9,
    })

    if (compressed.size > PROFILE_MAX_SIZE_BYTES) {
      throw new Error(`Profile photo must be under ${PROFILE_MAX_SIZE_MB}MB after compression.`)
    }

    return compressed
  } catch (err) {
    if (err.message?.includes('Profile photo')) throw err
    throw new Error('Image compression failed. Try a different photo.')
  }
}

export async function compressXrayImage(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Please select a valid image file.')
  }

  const originalSize = file.size
  let maxWidthOrHeight = 1920
  let compressed = file

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      compressed = await imageCompression(file, {
        maxSizeMB: XRAY_MAX_SIZE_MB,
        maxWidthOrHeight,
        useWebWorker: true,
        initialQuality: 0.85,
      })
    } catch {
      throw new Error('Image compression failed. Try a different image.')
    }

    if (compressed.size <= XRAY_MAX_SIZE_BYTES) {
      return {
        file: compressed,
        originalSize,
        compressedSize: compressed.size,
        wasCompressed: compressed.size < originalSize,
      }
    }

    maxWidthOrHeight = Math.round(maxWidthOrHeight * 0.8)
  }

  throw new Error(
    `Could not compress image below ${XRAY_MAX_SIZE_MB}MB (result: ${formatFileSize(compressed.size)}). Use a smaller image.`,
  )
}
