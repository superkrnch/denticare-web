import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { THEME_KEY, THEMES, applyTheme, getPreferredTheme } from '@/utils/theme'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(getPreferredTheme())

  const isDark = computed(() => theme.value === THEMES.DARK)

  function setTheme(next, { animate = true } = {}) {
    theme.value = next === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT
    applyTheme(theme.value, { animate })

    try {
      localStorage.setItem(THEME_KEY, theme.value)
    } catch {
      // ignore storage errors
    }
  }

  function toggleTheme() {
    setTheme(isDark.value ? THEMES.LIGHT : THEMES.DARK)
  }

  function init() {
    applyTheme(theme.value, { animate: false })
  }

  return { theme, isDark, setTheme, toggleTheme, init, THEMES }
})
