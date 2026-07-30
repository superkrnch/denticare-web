/**
 * Seed default Firestore documents (requires admin credentials in .env).
 *
 * Usage: node scripts/seed-firestore.mjs
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DEFAULT_TREATMENT_TEMPLATES } from '../src/constants/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env')
    const envContent = readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const [key, ...vals] = line.split('=')
      if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
    })
  } catch {
    console.warn('No .env file found.')
  }
}

loadEnv()

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@denticare.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const defaultSettings = {
  clinicName: 'DentiCare Dental Clinic',
  address: '',
  phone: '',
  email: '',
  hours: {
    monday: { open: '08:00', close: '17:00', closed: false },
    tuesday: { open: '08:00', close: '17:00', closed: false },
    wednesday: { open: '08:00', close: '17:00', closed: false },
    thursday: { open: '08:00', close: '17:00', closed: false },
    friday: { open: '08:00', close: '17:00', closed: false },
    saturday: { open: '08:00', close: '12:00', closed: false },
    sunday: { open: '', close: '', closed: true },
  },
  dentistSchedules: [],
  backupEnabled: false,
  backupFrequency: 'weekly',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function seed() {
  console.log('Signing in as admin...')
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)

  const settingsRef = doc(db, 'settings', 'clinic')
  const existing = await getDoc(settingsRef)

  if (existing.exists()) {
    console.log('settings/clinic already exists — skipped.')
  } else {
    await setDoc(settingsRef, {
      ...defaultSettings,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log('Created settings/clinic with default clinic configuration.')
  }

  const templatesRef = doc(db, 'settings', 'treatment_templates')
  const templatesExisting = await getDoc(templatesRef)
  if (templatesExisting.exists()) {
    console.log('settings/treatment_templates already exists — skipped.')
  } else {
    await setDoc(templatesRef, {
      items: DEFAULT_TREATMENT_TEMPLATES,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log('Created settings/treatment_templates with default procedure presets.')
  }

  console.log('Done.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
