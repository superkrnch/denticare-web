import { initializeApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = getAuth(app)

/**
 * Local (cross-tab) auth so secondary tabs — e.g. the TV queue display — share
 * the login. Inactivity-based auto sign-out is handled separately via the
 * activity timestamp (see utils/sessionActivity + composables/useSessionTimeout).
 */
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence)
export const db = getFirestore(app)
export const storage = getStorage(app)

/** Secondary app for admin user creation without signing out current admin */
let secondaryApp = null
export function getSecondaryAuth() {
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, 'Secondary')
  }
  return getAuth(secondaryApp)
}

export default app
