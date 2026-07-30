<template>
  <div class="min-h-screen bg-slate-100/80 transition-colors duration-300 dark:bg-slate-950">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <Transition name="overlay">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <div class="lg:pl-[17.5rem] transition-[padding] duration-300 ease-in-out">
      <AppHeader :title="pageTitle" :subtitle="pageSubtitle" @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      <main class="p-4 lg:p-8">
        <router-view v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </router-view>
      </main>
    </div>

    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { usePageStore } from '@/stores/page'
import { useQueueStore } from '@/stores/queue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const pageStore = usePageStore()
const queue = useQueueStore()
const auth = useAuthStore()
const sidebarOpen = ref(false)

const pageTitle = computed(() => {
  if (pageStore.headerMatchesRoute(route.path)) {
    return pageStore.title || route.meta.title || 'Dashboard'
  }
  return route.meta.title || 'Dashboard'
})
const pageSubtitle = computed(() => {
  if (pageStore.headerMatchesRoute(route.path)) {
    return pageStore.subtitle || route.meta.subtitle || ''
  }
  return route.meta.subtitle || ''
})

watch(() => route.fullPath, () => pageStore.clearHeader(), { flush: 'sync' })

onMounted(() => {
  if (auth.isAuthenticated) queue.subscribeToday()
})

onUnmounted(() => queue.unsubscribeQueue())
</script>
