export const THEME_KEY = 'denticare-theme'

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
}

export function getPreferredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === THEMES.LIGHT || stored === THEMES.DARK) return stored
  } catch {
    // ignore storage errors
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT
}

export function applyTheme(theme, { animate = false } = {}) {
  const root = document.documentElement
  const isDark = theme === THEMES.DARK

  if (animate) {
    root.classList.add('theme-transitioning')
  }

  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'

  if (animate) {
    window.setTimeout(() => {
      root.classList.remove('theme-transitioning')
    }, 400)
  }
}
