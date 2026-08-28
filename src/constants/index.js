/** Sign out after this many milliseconds without user activity (30 minutes). */
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000

export const ROLES = {
  ADMIN: 'administrator',
  DENTIST: 'dentist',
  ASSISTANT: 'dental_assistant',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.DENTIST]: 'Dentist',
  [ROLES.ASSISTANT]: 'Receptionist',
}

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
}

export const QUEUE_STATUS = {
  WAITING: 'waiting',
  SERVING: 'serving',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
}

export const TOOTH_STATUS = {
  HEALTHY: 'healthy',
  DECAYED: 'decayed',
  FILLED: 'filled',
  MISSING: 'missing',
  CROWN: 'crown',
  ROOT_CANAL: 'root_canal',
  EXTRACTION_NEEDED: 'extraction_needed',
  BRIDGE: 'bridge',
  IMPLANT: 'implant',
  IMPACTED: 'impacted',
}

export const TOOTH_STATUS_LABELS = {
  [TOOTH_STATUS.HEALTHY]: 'Healthy',
  [TOOTH_STATUS.DECAYED]: 'Decayed',
  [TOOTH_STATUS.FILLED]: 'Filled',
  [TOOTH_STATUS.MISSING]: 'Missing',
  [TOOTH_STATUS.CROWN]: 'Crown',
  [TOOTH_STATUS.ROOT_CANAL]: 'Root Canal',
  [TOOTH_STATUS.EXTRACTION_NEEDED]: 'Extraction Needed',
  [TOOTH_STATUS.BRIDGE]: 'Bridge',
  [TOOTH_STATUS.IMPLANT]: 'Implant',
  [TOOTH_STATUS.IMPACTED]: 'Impacted',
}

export const TOOTH_STATUS_COLORS = {
  [TOOTH_STATUS.HEALTHY]: 'bg-slate-50 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300',
  [TOOTH_STATUS.DECAYED]: 'bg-red-100 border-red-400 text-red-800 dark:bg-red-500/15 dark:border-red-500/50 dark:text-red-300',
  [TOOTH_STATUS.FILLED]: 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-500/15 dark:border-blue-500/50 dark:text-blue-300',
  [TOOTH_STATUS.MISSING]: 'bg-slate-200 border-slate-400 text-slate-500 dark:bg-slate-700/60 dark:border-slate-500 dark:text-slate-400',
  [TOOTH_STATUS.CROWN]: 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-500/15 dark:border-yellow-500/50 dark:text-yellow-300',
  [TOOTH_STATUS.ROOT_CANAL]: 'bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-500/15 dark:border-purple-500/50 dark:text-purple-300',
  [TOOTH_STATUS.EXTRACTION_NEEDED]: 'bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-500/15 dark:border-orange-500/50 dark:text-orange-300',
  [TOOTH_STATUS.BRIDGE]: 'bg-teal-100 border-teal-400 text-teal-800 dark:bg-teal-500/15 dark:border-teal-500/50 dark:text-teal-300',
  [TOOTH_STATUS.IMPLANT]: 'bg-cyan-100 border-cyan-400 text-cyan-800 dark:bg-cyan-500/15 dark:border-cyan-500/50 dark:text-cyan-300',
  [TOOTH_STATUS.IMPACTED]: 'bg-pink-100 border-pink-400 text-pink-800 dark:bg-pink-500/15 dark:border-pink-500/50 dark:text-pink-300',
}

/** Solid swatch colors for the odontogram legend. */
export const TOOTH_STATUS_DOT_COLORS = {
  [TOOTH_STATUS.HEALTHY]: 'bg-emerald-400',
  [TOOTH_STATUS.DECAYED]: 'bg-red-500',
  [TOOTH_STATUS.FILLED]: 'bg-blue-500',
  [TOOTH_STATUS.MISSING]: 'bg-slate-400',
  [TOOTH_STATUS.CROWN]: 'bg-yellow-500',
  [TOOTH_STATUS.ROOT_CANAL]: 'bg-purple-500',
  [TOOTH_STATUS.EXTRACTION_NEEDED]: 'bg-orange-500',
  [TOOTH_STATUS.BRIDGE]: 'bg-teal-500',
  [TOOTH_STATUS.IMPLANT]: 'bg-cyan-500',
  [TOOTH_STATUS.IMPACTED]: 'bg-pink-500',
}

/** Short codes shown on each tooth in the chart. */
export const TOOTH_STATUS_ABBR = {
  [TOOTH_STATUS.HEALTHY]: 'H',
  [TOOTH_STATUS.DECAYED]: 'D',
  [TOOTH_STATUS.FILLED]: 'F',
  [TOOTH_STATUS.MISSING]: 'M',
  [TOOTH_STATUS.CROWN]: 'Cr',
  [TOOTH_STATUS.ROOT_CANAL]: 'RC',
  [TOOTH_STATUS.EXTRACTION_NEEDED]: 'Ext',
  [TOOTH_STATUS.BRIDGE]: 'Br',
  [TOOTH_STATUS.IMPLANT]: 'Im',
  [TOOTH_STATUS.IMPACTED]: 'Ip',
}

export const XRAY_TYPES = ['panoramic', 'bitewing', 'periapical', 'cephalometric']

export const TREATMENT_STATUS = {
  PLANNED: 'planned',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
}

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  GCASH: 'gcash',
  MAYA: 'maya',
  BANK: 'bank_transfer',
  ONLINE: 'online',
}

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Cash (in-store)',
  [PAYMENT_METHODS.CARD]: 'Card (in-store)',
  [PAYMENT_METHODS.GCASH]: 'GCash',
  [PAYMENT_METHODS.MAYA]: 'Maya',
  [PAYMENT_METHODS.BANK]: 'Bank Transfer',
  [PAYMENT_METHODS.ONLINE]: 'Online Payment',
}

export const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const SERVICE_TYPES = [
  'Cleaning',
  'Filling',
  'Extraction',
  'Root Canal',
  'Crown',
  'Implant',
  'Checkup',
  'Whitening',
  'Orthodontics',
  'Other',
]

/** Default procedure presets for treatment plans (editable in the clinic app). */
export const DEFAULT_TREATMENT_TEMPLATES = [
  { id: 'checkup', name: 'Checkup', defaultCost: 800, defaultNotes: 'Routine dental examination' },
  { id: 'cleaning', name: 'Cleaning', defaultCost: 1500, defaultNotes: 'Professional teeth cleaning' },
  { id: 'filling', name: 'Filling', defaultCost: 2000, defaultNotes: 'Tooth-colored composite filling' },
  { id: 'extraction', name: 'Extraction', defaultCost: 2500, defaultNotes: 'Simple tooth extraction' },
  { id: 'root_canal', name: 'Root Canal', defaultCost: 8000, defaultNotes: 'Endodontic treatment' },
  { id: 'crown', name: 'Crown', defaultCost: 15000, defaultNotes: 'Porcelain crown placement' },
  { id: 'implant', name: 'Implant', defaultCost: 45000, defaultNotes: 'Dental implant procedure' },
  { id: 'whitening', name: 'Whitening', defaultCost: 12000, defaultNotes: 'In-office whitening session' },
  { id: 'orthodontics', name: 'Orthodontics', defaultCost: 35000, defaultNotes: 'Orthodontic consultation / braces' },
  { id: 'other', name: 'Other', defaultCost: 0, defaultNotes: '' },
]

/** FDI permanent (adult) tooth numbering: 18-11, 21-28, 48-41, 31-38 */
export const TOOTH_NUMBERS = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
]

/** FDI primary (child / deciduous) tooth numbering: 55-51, 61-65, 85-81, 71-75 */
export const TOOTH_NUMBERS_CHILD = [
  55, 54, 53, 52, 51,
  61, 62, 63, 64, 65,
  85, 84, 83, 82, 81,
  71, 72, 73, 74, 75,
]

export const COLLECTIONS = {
  USERS: 'users',
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  QUEUES: 'queues',
  ODONTOGRAMS: 'odontograms',
  XRAYS: 'xrays',
  TREATMENTS: 'treatments',
  BILLINGS: 'billings',
  QUEUE_COUNTERS: 'queue_counters',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  ACTIVITIES: 'activities',
  EDITING: 'editing_appointments',
  CHAT_ROOMS: 'chatRooms',
  MESSAGES: 'messages',
}
