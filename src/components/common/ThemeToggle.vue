<template>
  <button
    type="button"
    class="btn-ghost p-2"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Light mode' : 'Dark mode'"
    @click="themeStore.toggleTheme()"
  >
    <Transition name="theme-icon" mode="out-in">
      <Sun v-if="isDark" key="sun" class="h-[18px] w-[18px]" :stroke-width="1.75" />
      <Moon v-else key="moon" class="h-[18px] w-[18px]" :stroke-width="1.75" />
    </Transition>
  </button>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { Moon, Sun } from '@lucide/vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
</script>
