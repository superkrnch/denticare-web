<template>
  <div class="flex min-h-screen">
    <div class="relative hidden w-1/2 overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.25),_transparent_50%)]" />
      <div class="relative flex items-center gap-3">
        <AppLogo size="md" />
        <span class="text-lg font-semibold text-white">DentiCare</span>
      </div>
      <div class="relative max-w-md">
        <h2 class="text-3xl font-semibold leading-tight tracking-tight text-white">
          Modern dental clinic management, simplified.
        </h2>
        <p class="mt-4 text-sm leading-relaxed text-slate-300">
          Patients, appointments, billing, and records — organized in one calm, easy-to-use workspace.
        </p>
      </div>
      <p class="relative text-xs text-slate-500">Secure sign-in for clinic staff only</p>
    </div>

    <div class="relative flex w-full flex-1 items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div class="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div class="w-full max-w-md">
        <div class="mb-8 lg:hidden">
          <div class="mb-4 flex items-center gap-3">
            <AppLogo size="md" />
            <span class="text-lg font-semibold text-slate-900 dark:text-slate-100">DentiCare</span>
          </div>
        </div>

        <div class="card p-8">
          <div class="mb-8">
            <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Welcome back</h1>
            <p class="mt-1 text-sm text-slate-500">Sign in to continue to your clinic dashboard</p>
          </div>

          <form class="space-y-5" @submit.prevent="handleLogin">
            <div>
              <label class="label" for="email">Email address</label>
              <div class="relative">
                <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" :stroke-width="1.75" />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  class="input pl-10"
                  required
                  placeholder="admin@denticare.com"
                  autocomplete="email"
                />
              </div>
            </div>
            <div>
              <label class="label" for="password">Password</label>
              <div class="relative">
                <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" :stroke-width="1.75" />
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="input pl-10 pr-10"
                  required
                  placeholder="Enter your password"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="h-4 w-4" :stroke-width="1.75" />
                  <Eye v-else class="h-4 w-4" :stroke-width="1.75" />
                </button>
              </div>
            </div>

            <p
              v-if="sessionExpired"
              class="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <CircleAlert class="mt-0.5 h-4 w-4 shrink-0" :stroke-width="1.75" />
              You were signed out after 30 minutes of inactivity. Please sign in again.
            </p>

            <p v-if="error" class="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <CircleAlert class="mt-0.5 h-4 w-4 shrink-0" :stroke-width="1.75" />
              {{ error }}
            </p>

            <button type="submit" class="btn-primary w-full" :disabled="loading">
              <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" :stroke-width="1.75" />
              {{ loading ? 'Signing in...' : 'Sign in' }}
            </button>
          </form>

          <div class="mt-6 text-center">
            <router-link
              to="/reset-password"
              class="text-sm font-medium text-primary-700 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Forgot your password?
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { consumeSessionExpiredFlag } from '@/utils/sessionActivity'
import AppLogo from '@/components/common/AppLogo.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const sessionExpired = ref(false)

onMounted(() => {
  if (route.query.reason === 'timeout' || consumeSessionExpiredFlag()) {
    sessionExpired.value = true
    router.replace({ query: {} })
  }
})

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    toast.success('Welcome back!')
    router.push('/')
  } catch (e) {
    error.value = e.message || 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}
</script>
