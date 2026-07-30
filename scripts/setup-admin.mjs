/**
 * One-time script to create the initial administrator account.
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in Firebase config
 *   2. Set ADMIN_EMAIL and ADMIN_PASSWORD below
 *   3. Run: node scripts/setup-admin.mjs
 *
 * Or create the user manually in Firebase Console and add a Firestore document:
 *   Collection: users
 *   Document ID: <Firebase Auth UID>
 *   Fields: { email, displayName, role: "administrator", active: true, phone: "" }
 */

import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env manually
try {
  const envPath = resolve(__dirname, '../.env')
  const envContent = readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  })
} catch {
  console.warn('No .env file found. Set environment variables manually.')
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@denticare.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!'
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function setup() {
  console.log('Creating administrator account...')
  let cred
  try {
    cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      console.log('Auth user already exists — signing in to finish profile setup...')
      cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
    } else {
      throw err
    }
  }
  await setDoc(doc(db, 'users', cred.user.uid), {
    email: ADMIN_EMAIL,
    displayName: ADMIN_NAME,
    role: 'administrator',
    active: true,
    phone: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  console.log(`Admin created successfully!`)
  console.log(`  Email: ${ADMIN_EMAIL}`)
  console.log(`  UID: ${cred.user.uid}`)
  process.exit(0)
}

setup().catch((err) => {
  console.error('Setup failed:', err.message)
  process.exit(1)
})
