<template>
  <div class="max-w-xl">
    <div class="card p-6">
      <div class="mb-8 flex flex-col items-center gap-4 border-b border-slate-100 pb-8 dark:border-slate-800 sm:flex-row sm:items-start">
        <div class="relative">
          <UserAvatar
            :name="auth.displayName"
            :photo-url="auth.photoUrl"
            size="xl"
          />
          <label
            class="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-primary-600 text-white shadow-md transition-colors hover:bg-primary-700 dark:border-slate-900"
            :class="{ 'pointer-events-none opacity-60': photoUploading }"
            title="Change photo"
          >
            <Camera class="h-4 w-4" :stroke-width="1.75" />
            <input
              type="file"
              accept="image/*"
              class="sr-only"
              :disabled="photoUploading"
              @change="onPhotoSelect"
            />
          </label>
        </div>

        <div class="flex-1 text-center sm:text-left">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ auth.displayName }}</h2>
          <p class="text-sm capitalize text-slate-500 dark:text-slate-400">{{ auth.role?.replace(/_/g, ' ') }}</p>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            JPG or PNG, auto-compressed to 1MB max.
          </p>
          <div class="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <label
              class="btn-secondary cursor-pointer text-xs"
              :class="{ 'pointer-events-none opacity-60': photoUploading }"
            >
              <LoaderCircle v-if="photoUploading" class="h-3.5 w-3.5 animate-spin" :stroke-width="1.75" />
              {{ photoUploading ? 'Uploading...' : 'Upload photo' }}
              <input
                type="file"
                accept="image/*"
                class="sr-only"
                :disabled="photoUploading"
                @change="onPhotoSelect"
              />
            </label>
            <button
              v-if="auth.photoUrl"
              type="button"
              class="btn-ghost text-xs text-red-600 dark:text-red-400"
              :disabled="photoUploading"
              @click="handleRemovePhoto"
            >
              Remove photo
            </button>
          </div>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="handleSave">
        <div>
          <label class="label">Display Name</label>
          <input v-model="form.displayName" class="input" required />
        </div>
        <div>
          <label class="label">Email</label>
          <input :value="auth.user?.email" class="input bg-slate-50 dark:bg-slate-800/60" disabled />
        </div>
        <div>
          <label class="label">Phone</label>
          <input v-model="form.phone" class="input" />
        </div>
        <div>
          <label class="label">Role</label>
          <input :value="auth.role?.replace(/_/g, ' ')" class="input bg-slate-50 capitalize dark:bg-slate-800/60" disabled />
        </div>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? 'Saving...' : 'Update Profile' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Camera, LoaderCircle } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import UserAvatar from '@/components/common/UserAvatar.vue'

const auth = useAuthStore()
const toast = useToastStore()
const saving = ref(false)
const photoUploading = ref(false)
const form = ref({ displayName: '', phone: '' })

onMounted(() => {
  form.value = {
    displayName: auth.profile?.displayName || '',
    phone: auth.profile?.phone || '',
  }
})

async function onPhotoSelect(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return

  photoUploading.value = true
  try {
    await auth.uploadProfilePhoto(file)
    toast.success('Profile photo updated.')
  } catch (err) {
    toast.error(err.message)
  } finally {
    photoUploading.value = false
  }
}

async function handleRemovePhoto() {
  if (!confirm('Remove your profile photo?')) return

  photoUploading.value = true
  try {
    await auth.removeProfilePhoto()
    toast.success('Profile photo removed.')
  } catch (err) {
    toast.error(err.message)
  } finally {
    photoUploading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await auth.updateUserProfile(form.value)
    toast.success('Profile updated successfully.')
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}
</script>
