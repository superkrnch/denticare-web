<template>
  <header class="app-header sticky top-0 z-30 flex min-h-[4.75rem] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 lg:px-8">
    <div class="flex min-w-0 items-center gap-3">
      <button
        type="button"
        class="btn-ghost p-2 lg:hidden"
        aria-label="Open menu"
        @click="$emit('toggle-sidebar')"
      >
        <Menu class="h-5 w-5" :stroke-width="1.75" />
      </button>
      <div class="min-w-0">
        <h2 class="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 lg:text-2xl">{{ title }}</h2>
        <p v-if="subtitle" class="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{{ subtitle }}</p>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-2 sm:gap-3">
      <ThemeToggle />
      <button
        type="button"
        class="btn-ghost p-2.5"
        aria-label="Sign out"
        title="Sign out"
        @click="handleLogout"
      >
        <LogOut class="h-4 w-4" :stroke-width="1.75" />
        <span class="hidden sm:inline">Sign out</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { LogOut, Menu } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import ThemeToggle from '@/components/common/ThemeToggle.vue'

defineProps({
  title: { type: String, default: 'Dashboard' },
  subtitle: { type: String, default: '' },
})
defineEmits(['toggle-sidebar'])

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

async function handleLogout() {
  await auth.logout()
  toast.info('You have been signed out.')
  router.push('/login')
}
</script>
