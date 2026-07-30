/**

 * Create test patient records, Firebase Auth accounts, and patient_accounts links.

 *

 * Usage: npm run setup:patients

 */



import { initializeApp, getApps } from 'firebase/app'

import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'

import {

  getFirestore, collection, doc, setDoc, getDoc, addDoc, serverTimestamp, query, where, getDocs,

} from 'firebase/firestore'

import { readFileSync } from 'fs'

import { resolve, dirname } from 'path'

import { fileURLToPath } from 'url'



const __dirname = dirname(fileURLToPath(import.meta.url))



function loadEnv() {

  try {

    const envPath = resolve(__dirname, '../.env')

    readFileSync(envPath, 'utf8').split('\n').forEach((line) => {

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



const PATIENTS = [

  {

    email: 'juan.delacruz@email.com',

    password: 'Patient123!',

    firstName: 'Juan',

    lastName: 'Dela Cruz',

    birthdate: '1992-05-14',

    sex: 'male',

    contactNumber: '09171234567',

    address: '45 Mabini St, Quezon City',

    emergencyContact: 'Maria Dela Cruz — 09189876543',

    medicalConditions: 'None',

    allergies: 'Penicillin',

    currentMedications: 'None',

  },

  {

    email: 'ana.reyes@email.com',

    password: 'Patient123!',

    firstName: 'Ana',

    lastName: 'Reyes',

    birthdate: '1988-11-02',

    sex: 'female',

    contactNumber: '09181234567',

    address: '12 Rizal Ave, Manila',

    emergencyContact: 'Carlos Reyes — 09191234567',

    medicalConditions: 'Hypertension',

    allergies: 'None',

    currentMedications: 'Losartan 50mg',

  },

]



const firebaseConfig = {

  apiKey: process.env.VITE_FIREBASE_API_KEY,

  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,

  projectId: process.env.VITE_FIREBASE_PROJECT_ID,

  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId: process.env.VITE_FIREBASE_APP_ID,

}



function calculateAge(birthdate) {

  const birth = new Date(birthdate)

  const now = new Date()

  let age = now.getFullYear() - birth.getFullYear()

  const m = now.getMonth() - birth.getMonth()

  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1

  return age

}



const primaryApp = initializeApp(firebaseConfig)

const secondaryApp = initializeApp(firebaseConfig, 'PatientSetup')

const adminAuth = getAuth(primaryApp)

const patientAuth = getAuth(secondaryApp)

const db = getFirestore(primaryApp)



async function findPatientByEmail(email) {

  const snap = await getDocs(query(collection(db, 'patients'), where('email', '==', email)))

  return snap.docs[0] || null

}



async function setupPatient(profile) {

  console.log(`\n— ${profile.firstName} ${profile.lastName} (${profile.email})`)



  let patientId

  const existingPatient = await findPatientByEmail(profile.email)

  if (existingPatient) {

    patientId = existingPatient.id

    await setDoc(doc(db, 'patients', patientId), {

      ...profile,

      age: calculateAge(profile.birthdate),

      archived: false,

      updatedAt: serverTimestamp(),

    }, { merge: true })

    console.log('  Patient record updated:', patientId)

  } else {

    const ref = await addDoc(collection(db, 'patients'), {

      ...profile,

      age: calculateAge(profile.birthdate),

      archived: false,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),

    })

    patientId = ref.id

    console.log('  Patient record created:', patientId)

  }



  let uid

  try {

    const cred = await createUserWithEmailAndPassword(patientAuth, profile.email, profile.password)

    uid = cred.user.uid

    console.log('  Auth account created:', uid)

  } catch (err) {

    if (err.code === 'auth/email-already-in-use') {

      const cred = await signInWithEmailAndPassword(patientAuth, profile.email, profile.password)

      uid = cred.user.uid

      console.log('  Auth account exists:', uid)

    } else {

      throw err

    }

  } finally {

    await signOut(patientAuth)

  }



  await setDoc(doc(db, 'patient_accounts', uid), {

    patientId,

    email: profile.email,

    displayName: `${profile.firstName} ${profile.lastName}`,

    active: true,

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp(),

  }, { merge: true })

  console.log('  patient_accounts link saved')

}



async function syncPrimaryDentist() {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'dentist'), where('active', '==', true)))
  const dentist = snap.docs[0]
  if (!dentist) {
    console.log('\nNo active dentist found — skipping primaryDentist on settings.')
    return
  }
  await setDoc(doc(db, 'settings', 'clinic'), {
    primaryDentistId: dentist.id,
    primaryDentistName: dentist.data().displayName,
    updatedAt: serverTimestamp(),
  }, { merge: true })
  console.log(`\nClinic settings: primary dentist → ${dentist.data().displayName}`)
}

async function setup() {
  console.log('Signing in as admin...')
  await signInWithEmailAndPassword(adminAuth, ADMIN_EMAIL, ADMIN_PASSWORD)

  await syncPrimaryDentist()

  for (const profile of PATIENTS) {
    await setupPatient(profile)
  }



  console.log('\nDone! Patient portal logins:')

  for (const p of PATIENTS) {

    console.log(`  ${p.email} / ${p.password}`)

  }

  process.exit(0)

}



setup().catch((err) => {

  console.error('Setup failed:', err.message)

  process.exit(1)

})


