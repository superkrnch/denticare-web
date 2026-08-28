<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex min-h-[4.75rem] items-center gap-3 border-b border-slate-100 px-5 dark:border-slate-800">
      <AppLogo size="md" />
      <div class="min-w-0">
        <h1 class="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">DentiCare</h1>
        <p class="truncate text-xs text-slate-500 dark:text-slate-400">Clinic workspace</p>
      </div>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-5">
      <p class="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Menu</p>
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="isActive(item.to) ? 'nav-item-active' : 'nav-item-inactive'"
        @click="$emit('close')"
      >
        <span class="relative shrink-0">
          <component :is="item.icon" class="h-[18px] w-[18px]" :stroke-width="1.75" />
          <span
            v-if="badgeCount(item.to) > 0"
            class="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ring-2"
            :class="badgeClass(item.to)"
            :aria-label="badgeLabel(item.to)"
          >
            {{ formatNavBadge(badgeCount(item.to)) }}
          </span>
        </span>
        <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="border-t border-slate-100 p-4 dark:border-slate-800">
      <router-link
        to="/profile"
        class="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        @click="$emit('close')"
      >
        <UserAvatar :name="auth.displayName" :photo-url="auth.photoUrl" size="sm" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ auth.displayName }}</p>
          <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ roleLabel }}</p>
        </div>
      </router-link>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ListOrdered,
  Smile,
  ScanLine,
  ClipboardList,
  ListChecks,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  MessageCircle,
} from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { usePatientMessagesStore } from '@/stores/patientMessages'
import { useAppointmentsStore } from '@/stores/appointments'
import { useQueueStore } from '@/stores/queue'
import { ROLES, ROLE_LABELS } from '@/constants'
import { formatNavBadge, navBadgeClass, navBadgeCount, navBadgeLabel } from '@/utils/navBadges'
import AppLogo from '@/components/common/AppLogo.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'

defineProps({ open: Boolean })
defineEmits(['close'])

const route = useRoute()
const auth = useAuthStore()
const patientMessages = usePatientMessagesStore()
const appointments = useAppointmentsStore()
const queue = useQueueStore()

const badgeSources = { patientMessages, appointments, queue }

function badgeCount(path) {
  return navBadgeCount(path, badgeSources)
}

function badgeLabel(path) {
  return navBadgeLabel(path, badgeCount(path))
}

function badgeClass(path) {
  return navBadgeClass(path)
}

const allNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/patients', label: 'Patients', icon: Users, roles: null },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays, roles: null },
  { to: '/queue', label: 'Queue', icon: ListOrdered, roles: null },
  { to: '/odontogram', label: 'Odontogram', icon: Smile, roles: [ROLES.ADMIN, ROLES.DENTIST] },
  { to: '/xrays', label: 'X-Rays', icon: ScanLine, roles: null },
  { to: '/treatments', label: 'Treatments', icon: ClipboardList, roles: null },
  { to: '/treatments/presets', label: 'Procedure presets', icon: ListChecks, roles: null },
  { to: '/billing', label: 'Billing', icon: Receipt, roles: null },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: [ROLES.ADMIN, ROLES.DENTIST] },
  { to: '/users', label: 'Team', icon: UserCog, roles: [ROLES.ADMIN] },
  { to: '/settings', label: 'Availability', icon: Settings, roles: [ROLES.DENTIST] },
  { to: '/patient-messages', label: 'Patient messages', icon: MessageCircle, roles: [ROLES.ADMIN, ROLES.DENTIST, ROLES.ASSISTANT] },
]

const navItems = computed(() =>
  allNavItems.filter((item) => !item.roles || auth.hasRole(...item.roles)),
)

const roleLabel = computed(() => ROLE_LABELS[auth.role] || auth.role?.replace(/_/g, ' ') || 'Staff')

function isActive(path) {
  if (path === '/') return route.path === '/'
  if (path === '/treatments') return route.path === '/treatments'
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>
