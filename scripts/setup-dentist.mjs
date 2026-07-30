/**
 * Create a dentist staff account (requires existing admin in .env).
 *
 * Usage: npm run setup:dentist
 *
 * Optional env vars:
 *   DENTIST_EMAIL, DENTIST_PASSWORD, DENTIST_NAME
 */

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getDefaultAvailability } from '../src/utils/availability.js'

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
const DENTIST_EMAIL = process.env.DENTIST_EMAIL || 'dentist@denticare.com'
const DENTIST_PASSWORD = process.env.DENTIST_PASSWORD || 'Dentist123!'
const DENTIST_NAME = process.env.DENTIST_NAME || 'Dr. Maria Santos'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const primaryApp = initializeApp(firebaseConfig)
const secondaryApp = initializeApp(firebaseConfig, 'DentistSetup')
const adminAuth = getAuth(primaryApp)
const secondaryAuth = getAuth(secondaryApp)
const db = getFirestore(primaryApp)

async function setup() {
  console.log('Signing in as admin...')
  await signInWithEmailAndPassword(adminAuth, ADMIN_EMAIL, ADMIN_PASSWORD)

  const existing = await getDoc(doc(db, 'users', DENTIST_EMAIL))
  if (existing.exists()) {
    console.log('Dentist profile already exists for this email lookup — checking auth...')
  }

  console.log('Creating dentist auth account...')
  let uid
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, DENTIST_EMAIL, DENTIST_PASSWORD)
    uid = cred.user.uid
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('Auth user already exists — signing in to finish profile setup...')
      const cred = await signInWithEmailAndPassword(secondaryAuth, DENTIST_EMAIL, DENTIST_PASSWORD)
      uid = cred.user.uid
    } else {
      throw err
    }
  } finally {
    await signOut(secondaryAuth)
  }

  await setDoc(doc(db, 'users', uid), {
    email: DENTIST_EMAIL,
    displayName: DENTIST_NAME,
    role: 'dentist',
    active: true,
    phone: '',
    availability: getDefaultAvailability(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  console.log('Dentist account ready!')
  console.log(`  Name:  ${DENTIST_NAME}`)
  console.log(`  Email: ${DENTIST_EMAIL}`)
  console.log(`  Password: ${DENTIST_PASSWORD}`)
  console.log(`  UID: ${uid}`)
  process.exit(0)
}

setup().catch((err) => {
  console.error('Setup failed:', err.message)
  process.exit(1)
})
