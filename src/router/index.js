import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/constants'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { guest: true },
  },
  {
    path: '/display/queue',
    name: 'queue-display',
    component: () => import('@/views/queue/QueueDisplayView.vue'),
    meta: { requiresAuth: true, kiosk: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('@/views/dashboard/DashboardView.vue'), meta: { title: 'Dashboard', subtitle: 'A quick overview of your clinic today' } },
      { path: 'profile', name: 'profile', component: () => import('@/views/auth/ProfileView.vue'), meta: { title: 'My Profile', subtitle: 'Update your details and profile photo' } },
      { path: 'patients', name: 'patients', component: () => import('@/views/patients/PatientListView.vue'), meta: { title: 'Patients', subtitle: 'Search, view, and manage patient records' } },
      { path: 'patients/new', name: 'patient-new', component: () => import('@/views/patients/PatientFormView.vue'), meta: { title: 'Add Patient', subtitle: 'Register a new patient record' } },
      { path: 'patients/:id', name: 'patient-detail', component: () => import('@/views/patients/PatientDetailView.vue'), meta: { title: 'Patient Profile' } },
      { path: 'patients/:id/edit', name: 'patient-edit', component: () => import('@/views/patients/PatientFormView.vue'), meta: { title: 'Edit Patient', subtitle: 'Update patient information' } },
      { path: 'appointments', name: 'appointments', component: () => import('@/views/appointments/AppointmentListView.vue'), meta: { title: 'Appointments', subtitle: 'Schedule and manage clinic appointments' } },
      { path: 'queue', name: 'queue', component: () => import('@/views/queue/QueueView.vue'), meta: { title: 'Queue Management', subtitle: "Today's patient queue" } },
      { path: 'odontogram', name: 'odontogram', component: () => import('@/views/odontogram/OdontogramView.vue'), meta: { title: 'Odontogram', subtitle: 'Chart tooth conditions per patient', roles: [ROLES.ADMIN, ROLES.DENTIST] } },
      { path: 'xrays', name: 'xrays', component: () => import('@/views/xrays/XRayView.vue'), meta: { title: 'X-Ray Management', subtitle: 'Upload and view patient X-rays from any device' } },
      { path: 'treatments', name: 'treatments', component: () => import('@/views/treatments/TreatmentPlanView.vue'), meta: { title: 'Treatment Plans', subtitle: 'Plan and track patient treatments' } },
      { path: 'treatments/presets', name: 'treatment-presets', component: () => import('@/views/treatments/TreatmentPresetsView.vue'), meta: { title: 'Procedure Presets', subtitle: 'Default procedures and prices for treatment plans' } },
      { path: 'billing', name: 'billing', component: () => import('@/views/billing/BillingListView.vue'), meta: { title: 'Billing', subtitle: 'Create invoices and record payments' } },
      { path: 'billing/:id', name: 'billing-detail', component: () => import('@/views/billing/BillingDetailView.vue'), meta: { title: 'Invoice Details' } },
      { path: 'reports', name: 'reports', component: () => import('@/views/reports/ReportsView.vue'), meta: { title: 'Reports', subtitle: 'View clinic performance and export data', roles: [ROLES.ADMIN, ROLES.DENTIST] } },
      { path: 'users', name: 'users', component: () => import('@/views/users/UserListView.vue'), meta: { title: 'User Management', subtitle: 'Manage staff accounts and roles', roles: [ROLES.ADMIN] } },
      { path: 'settings', name: 'settings', component: () => import('@/views/settings/SettingsView.vue'), meta: { title: 'My Availability', subtitle: 'Set the days and hours when you are available for appointments', roles: [ROLES.DENTIST] } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (!auth.initialized) auth.init()

  if (auth.loading) {
    await new Promise((resolve) => {
      const unwatch = setInterval(() => {
        if (!auth.loading) {
          clearInterval(unwatch)
          resolve()
        }
      }, 50)
    })
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next('/login')
  }
  if (to.meta.guest && auth.isAuthenticated) {
    return next('/')
  }
  if (to.meta.roles && !auth.canAccess(to.meta.roles)) {
    return next('/')
  }
  next()
})

export default router
