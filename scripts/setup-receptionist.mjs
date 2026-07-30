/**
 * Create a receptionist staff account (requires existing admin in .env).
 * Uses the dental_assistant role — front desk / reception access.
 *
 * Usage: npm run setup:receptionist
 *
 * Optional env vars:
 *   RECEPTIONIST_EMAIL, RECEPTIONIST_PASSWORD, RECEPTIONIST_NAME
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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
const RECEPTIONIST_EMAIL = process.env.RECEPTIONIST_EMAIL || 'receptionist@denticare.com'
const RECEPTIONIST_PASSWORD = process.env.RECEPTIONIST_PASSWORD || 'Reception123!'
const RECEPTIONIST_NAME = process.env.RECEPTIONIST_NAME || 'Jane Cruz'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const primaryApp = initializeApp(firebaseConfig)
const secondaryApp = initializeApp(firebaseConfig, 'ReceptionistSetup')
const adminAuth = getAuth(primaryApp)
const secondaryAuth = getAuth(secondaryApp)
const db = getFirestore(primaryApp)

async function setup() {
  console.log('Signing in as admin...')
  await signInWithEmailAndPassword(adminAuth, ADMIN_EMAIL, ADMIN_PASSWORD)

  console.log('Creating receptionist auth account...')
  let uid
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, RECEPTIONIST_EMAIL, RECEPTIONIST_PASSWORD)
    uid = cred.user.uid
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('Auth user already exists — signing in to finish profile setup...')
      const cred = await signInWithEmailAndPassword(secondaryAuth, RECEPTIONIST_EMAIL, RECEPTIONIST_PASSWORD)
      uid = cred.user.uid
    } else {
      throw err
    }
  } finally {
    await signOut(secondaryAuth)
  }

  await setDoc(doc(db, 'users', uid), {
    email: RECEPTIONIST_EMAIL,
    displayName: RECEPTIONIST_NAME,
    role: 'dental_assistant',
    active: true,
    phone: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  console.log('Receptionist account ready!')
  console.log(`  Name:  ${RECEPTIONIST_NAME}`)
  console.log(`  Email: ${RECEPTIONIST_EMAIL}`)
  console.log(`  Password: ${RECEPTIONIST_PASSWORD}`)
  console.log(`  UID: ${uid}`)
  process.exit(0)
}

setup().catch((err) => {
  console.error('Setup failed:', err.message)
  process.exit(1)
})
