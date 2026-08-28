<template>
  <div
    class="queue-display"
    :class="{
      'queue-display--dark': isDark,
      'queue-display--pulse': justCalled,
    }"
  >
    <div class="queue-display__glow" aria-hidden="true" />

    <header class="queue-display__header">
      <div class="flex items-center gap-4">
        <AppLogo size="lg" />
        <div>
          <h1 class="queue-display__clinic">{{ clinicName }}</h1>
          <p class="queue-display__tagline">{{ dentistLabel }}</p>
        </div>
      </div>
      <div class="queue-display__meta">
        <span class="queue-display__live">
          <span class="queue-display__live-dot" />
          LIVE
        </span>
        <p class="queue-display__clock">{{ clock }}</p>
      </div>
    </header>

    <main class="queue-display__main">
      <section class="queue-display__serving">
        <p class="queue-display__label">Now serving</p>
        <p v-if="servingNumber != null" class="queue-display__number" :key="servingNumber">
          {{ servingNumber }}
        </p>
        <p v-else class="queue-display__number queue-display__number--empty">—</p>
        <p class="queue-display__hint">
          {{ servingNumber != null ? 'Please proceed to the treatment area' : 'Please wait — we will call your number shortly' }}
        </p>
      </section>

      <section v-if="upNext.length" class="queue-display__upnext">
        <p class="queue-display__upnext-label">Up next</p>
        <div class="queue-display__upnext-list">
          <span v-for="item in upNext" :key="item.id" class="queue-display__upnext-chip">
            {{ item.queueNumber }}
          </span>
        </div>
      </section>
    </main>

    <footer class="queue-display__footer">
      <p>{{ waitingCount }} patient{{ waitingCount === 1 ? '' : 's' }} waiting</p>
      <div class="queue-display__footer-actions">
        <button
          type="button"
          class="queue-display__theme"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDark ? 'Light mode' : 'Dark mode'"
          @click="themeStore.toggleTheme()"
        >
          <Sun v-if="isDark" class="h-4 w-4" :stroke-width="1.75" />
          <Moon v-else class="h-4 w-4" :stroke-width="1.75" />
        </button>
        <button v-if="!isFullscreen" type="button" class="queue-display__fullscreen" @click="enterFullscreen">
          Fullscreen
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { format } from 'date-fns'
import { Moon, Sun } from '@lucide/vue'
import { useQueueStore } from '@/stores/queue'
import { useSettingsStore } from '@/stores/settings'
import { useUsersStore } from '@/stores/users'
import { useThemeStore } from '@/stores/theme'
import { useClinicDentists } from '@/composables/useClinicDentists'
import { playQueueChime } from '@/utils/queueNotify'
import AppLogo from '@/components/common/AppLogo.vue'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const queue = useQueueStore()
const settings = useSettingsStore()
const users = useUsersStore()

const clock = ref(format(new Date(), 'h:mm a'))
const justCalled = ref(false)
const isFullscreen = ref(false)
const dentistList = ref([])
let clockTimer = null
let pulseTimer = null

const { dentistLabel } = useClinicDentists(dentistList)

const clinicName = computed(() => settings.settings.clinicName || 'DentiCare')
const servingNumber = computed(() => queue.servingItem()?.queueNumber ?? null)
const waitingCount = computed(() => queue.totalWaiting())
const upNext = computed(() => queue.waitingList().slice(0, 6))

watch(servingNumber, (next, prev) => {
  if (prev !== undefined && next != null && next !== prev) {
    justCalled.value = true
    playQueueChime()
    clearTimeout(pulseTimer)
    pulseTimer = setTimeout(() => { justCalled.value = false }, 2500)
  }
})

watch(isDark, (dark) => {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.body.style.backgroundColor = dark ? '#020617' : '#f8fafc'
}, { immediate: true })

function enterFullscreen() {
  document.documentElement.requestFullscreen?.().catch(() => {})
}

function onFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

onMounted(async () => {
  await Promise.all([
    settings.loadSettings(),
    users.getDentists().then((d) => { dentistList.value = d }),
  ])
  queue.subscribeToday()
  clockTimer = setInterval(() => {
    clock.value = format(new Date(), 'h:mm a')
  }, 1000)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  queue.unsubscribeQueue()
  clearInterval(clockTimer)
  clearTimeout(pulseTimer)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.body.style.backgroundColor = ''
})
</script>

<style scoped>
.queue-display {
  --qd-bg: #f8fafc;
  --qd-text: #0f172a;
  --qd-muted: #64748b;
  --qd-subtle: #64748b;
  --qd-accent: #0d9488;
  --qd-live-bg: #ffffff;
  --qd-live-text: #0f766e;
  --qd-live-dot: #14b8a6;
  --qd-clock: #334155;
  --qd-number-from: #0f172a;
  --qd-number-to: #0d9488;
  --qd-empty: #94a3b8;
  --qd-chip-border: #cbd5e1;
  --qd-chip-bg: #ffffff;
  --qd-btn-border: #cbd5e1;
  --qd-btn-bg: #ffffff;
  --qd-btn-text: #334155;
  --qd-glow-1: rgb(13 148 136 / 0.14);
  --qd-glow-2: rgb(20 184 166 / 0.08);

  position: fixed;
  inset: 0;
  z-index: 0;
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
  overflow: hidden;
  background: var(--qd-bg);
  color: var(--qd-text);
  padding: clamp(1.5rem, 3vw, 3rem);
}

.queue-display--dark {
  --qd-bg: #020617;
  --qd-text: #f8fafc;
  --qd-muted: #94a3b8;
  --qd-subtle: #94a3b8;
  --qd-accent: #5eead4;
  --qd-live-bg: #0f172a;
  --qd-live-text: #5eead4;
  --qd-live-dot: #2dd4bf;
  --qd-clock: #cbd5e1;
  --qd-number-from: #ffffff;
  --qd-number-to: #99f6e4;
  --qd-empty: #475569;
  --qd-chip-border: #334155;
  --qd-chip-bg: #0f172a;
  --qd-btn-border: #334155;
  --qd-btn-bg: #0f172a;
  --qd-btn-text: #cbd5e1;
  --qd-glow-1: rgb(13 148 136 / 0.22);
  --qd-glow-2: rgb(20 184 166 / 0.12);
}

.queue-display__glow {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 50% 40%, var(--qd-glow-1), transparent 70%),
    radial-gradient(ellipse 40% 30% at 80% 80%, var(--qd-glow-2), transparent 60%);
}

.queue-display--pulse .queue-display__number {
  animation: serving-pulse 0.7s ease-in-out 3;
}

@keyframes serving-pulse {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.06); filter: brightness(1.15); }
}

.queue-display__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.queue-display__clinic {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.queue-display__tagline {
  margin-top: 0.25rem;
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  color: var(--qd-subtle);
}

.queue-display__meta { text-align: right; }

.queue-display__live {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 9999px;
  background: var(--qd-live-bg);
  padding: 0.35rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--qd-live-text);
}

.queue-display__live-dot {
  height: 0.5rem;
  width: 0.5rem;
  border-radius: 9999px;
  background: var(--qd-live-dot);
  animation: live-blink 1.5s ease-in-out infinite;
}

@keyframes live-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.queue-display__clock {
  margin-top: 0.75rem;
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 600;
  color: var(--qd-clock);
}

.queue-display__main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(2rem, 5vw, 4rem);
  padding: clamp(1rem, 4vw, 3rem) 0;
}

.queue-display__serving { text-align: center; }

.queue-display__label {
  font-size: clamp(1.25rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--qd-accent);
}

.queue-display__number {
  margin-top: 0.5rem;
  font-size: clamp(8rem, 22vw, 16rem);
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(180deg, var(--qd-number-from) 0%, var(--qd-number-to) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.queue-display__number--empty {
  background: none;
  color: var(--qd-empty);
  -webkit-text-fill-color: var(--qd-empty);
}

.queue-display__hint {
  margin-top: 1.5rem;
  max-width: 32rem;
  font-size: clamp(1rem, 2vw, 1.5rem);
  color: var(--qd-subtle);
}

.queue-display__upnext { text-align: center; }

.queue-display__upnext-label {
  margin-bottom: 1rem;
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--qd-muted);
}

.queue-display__upnext-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem 1rem;
}

.queue-display__upnext-chip {
  display: inline-flex;
  min-width: 4rem;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  border: 1px solid var(--qd-chip-border);
  background: var(--qd-chip-bg);
  padding: 0.75rem 1.25rem;
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: 700;
}

.queue-display__footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  color: var(--qd-muted);
}

.queue-display__footer-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.queue-display__theme,
.queue-display__fullscreen {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  border: 1px solid var(--qd-btn-border);
  background: var(--qd-btn-bg);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--qd-btn-text);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.queue-display__theme:hover,
.queue-display__fullscreen:hover {
  filter: brightness(0.97);
}

.queue-display--dark .queue-display__theme:hover,
.queue-display--dark .queue-display__fullscreen:hover {
  filter: brightness(1.15);
}

.queue-display__theme {
  padding: 0.5rem;
}
</style>
