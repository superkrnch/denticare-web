<template>
  <div class="queue-display" :class="{ 'queue-display--pulse': justCalled }">
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
      <button v-if="!isFullscreen" type="button" class="queue-display__fullscreen" @click="enterFullscreen">
        Fullscreen
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { format } from 'date-fns'
import { useQueueStore } from '@/stores/queue'
import { useSettingsStore } from '@/stores/settings'
import { useUsersStore } from '@/stores/users'
import { useClinicDentists } from '@/composables/useClinicDentists'
import { playQueueChime } from '@/utils/queueNotify'
import AppLogo from '@/components/common/AppLogo.vue'

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
})
</script>

<style scoped>
.queue-display {
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  overflow: hidden;
  background: #020617;
  color: #f8fafc;
  padding: clamp(1.5rem, 3vw, 3rem);
}

.queue-display__glow {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 50% 40%, rgb(13 148 136 / 0.18), transparent 70%),
    radial-gradient(ellipse 40% 30% at 80% 80%, rgb(20 184 166 / 0.08), transparent 60%);
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
  color: #94a3b8;
}

.queue-display__meta { text-align: right; }

.queue-display__live {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 9999px;
  background: rgb(15 23 42 / 0.8);
  padding: 0.35rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #5eead4;
}

.queue-display__live-dot {
  height: 0.5rem;
  width: 0.5rem;
  border-radius: 9999px;
  background: #2dd4bf;
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
  color: #cbd5e1;
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
  color: #5eead4;
}

.queue-display__number {
  margin-top: 0.5rem;
  font-size: clamp(8rem, 22vw, 16rem);
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(180deg, #ffffff 0%, #99f6e4 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.queue-display__number--empty {
  color: #475569;
  background: none;
  -webkit-text-fill-color: #475569;
}

.queue-display__hint {
  margin-top: 1.5rem;
  max-width: 32rem;
  font-size: clamp(1rem, 2vw, 1.5rem);
  color: #94a3b8;
}

.queue-display__upnext { text-align: center; }

.queue-display__upnext-label {
  margin-bottom: 1rem;
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #64748b;
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
  border: 1px solid rgb(51 65 85 / 0.8);
  background: rgb(15 23 42 / 0.7);
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
  color: #64748b;
}

.queue-display__fullscreen {
  border-radius: 0.75rem;
  border: 1px solid #334155;
  background: rgb(15 23 42 / 0.8);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #cbd5e1;
}
</style>
