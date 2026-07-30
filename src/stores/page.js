import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePageStore = defineStore('page', () => {
  const title = ref(null)
  const subtitle = ref(null)
  const headerForRoute = ref(null)

  function setHeader({ title: t = null, subtitle: s = null, forRoute = null } = {}) {
    title.value = t
    subtitle.value = s
    headerForRoute.value = forRoute
  }

  function clearHeader() {
    title.value = null
    subtitle.value = null
    headerForRoute.value = null
  }

  function headerMatchesRoute(routePath) {
    return headerForRoute.value != null && headerForRoute.value === routePath
  }

  return { title, subtitle, headerForRoute, setHeader, clearHeader, headerMatchesRoute }
})
