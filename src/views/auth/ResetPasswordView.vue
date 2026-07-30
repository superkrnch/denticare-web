<template>
  <div class="relative flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
    <div class="absolute right-4 top-4 sm:right-6 sm:top-6">
      <ThemeToggle />
    </div>
    <div class="w-full max-w-md">
      <div class="mb-6 flex items-center gap-3 lg:hidden">
        <AppLogo size="md" />
        <span class="text-lg font-semibold text-slate-900 dark:text-slate-100">DentiCare</span>
      </div>

      <div class="card p-8">
        <div class="mb-8">
          <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Reset password</h1>
          <p class="mt-1 text-sm text-slate-500">We'll email you a link to choose a new password</p>
        </div>

        <form class="space-y-5" @submit.prevent="handleReset">
          <div>
            <label class="label" for="reset-email">Email address</label>
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" :stroke-width="1.75" />
              <input id="reset-email" v-model="email" type="email" class="input pl-10" required />
            </div>
          </div>

          <p v-if="message" class="flex items-start gap-2 rounded-xl bg-teal-50 px-3 py-2.5 text-sm text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0" :stroke-width="1.75" />
            {{ message }}
          </p>
          <p v-if="error" class="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <CircleAlert class="mt-0.5 h-4 w-4 shrink-0" :stroke-width="1.75" />
            {{ error }}
          </p>

          <button type="submit" class="btn-primary w-full" :disabled="loading">
            <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" :stroke-width="1.75" />
            {{ loading ? 'Sending...' : 'Send reset link' }}
          </button>
        </form>

        <div class="mt-6 text-center">
          <router-link to="/login" class="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">
            <ArrowLeft class="h-4 w-4" :stroke-width="1.75" />
            Back to sign in
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowLeft, CheckCircle2, CircleAlert, LoaderCircle, Mail } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import AppLogo from '@/components/common/AppLogo.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'

const auth = useAuthStore()
const email = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

async function handleReset() {
  loading.value = true
  message.value = ''
  error.value = ''
  try {
    await auth.resetPassword(email.value)
    message.value = 'Check your inbox for the reset link.'
  } catch (e) {
    error.value = e.message || 'Failed to send reset email.'
  } finally {
    loading.value = false
  }
}
</script>
