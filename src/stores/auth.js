import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db, storage, getSecondaryAuth, authPersistenceReady } from '@/firebase/config'
import { COLLECTIONS, ROLES } from '@/constants'
import { compressProfileImage } from '@/utils/imageCompression'
import { clearLastActivity, flagSessionExpired, isSessionExpired, setLastActivity } from '@/utils/sessionActivity'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(true)
  const initialized = ref(false)
  let loginInProgress = false

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => profile.value?.role || null)
  const isAdmin = computed(() => role.value === ROLES.ADMIN)
  const isDentist = computed(() => role.value === ROLES.DENTIST)
  const isAssistant = computed(() => role.value === ROLES.ASSISTANT)
  const displayName = computed(() => profile.value?.displayName || user.value?.email || '')
  const photoUrl = computed(() => profile.value?.photoUrl || user.value?.photoURL || '')

  async function loadProfile(uid) {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid))
    if (snap.exists()) {
      profile.value = { id: snap.id, ...snap.data() }
    } else {
      profile.value = null
    }
  }

  function init() {
    if (initialized.value) return
    initialized.value = true
    authPersistenceReady.then(() => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && isSessionExpired() && !loginInProgress) {
          flagSessionExpired()
          await signOut(auth)
          clearLastActivity()
          user.value = null
          profile.value = null
          loading.value = false
          return
        }

        user.value = firebaseUser
        if (firebaseUser) {
          await loadProfile(firebaseUser.uid)
          if (profile.value && !profile.value.active) {
            await signOut(auth)
            clearLastActivity()
            user.value = null
            profile.value = null
          } else {
            setLastActivity()
          }
        } else {
          profile.value = null
        }
        loading.value = false
      })
    })
  }

  async function login(email, password) {
    await authPersistenceReady
    loginInProgress = true
    setLastActivity()
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await loadProfile(cred.user.uid)
      if (!profile.value) {
        await signOut(auth)
        clearLastActivity()
        throw new Error('No staff profile found for this account. Contact an administrator.')
      }
      if (!profile.value.active) {
        await signOut(auth)
        clearLastActivity()
        throw new Error('Your account has been deactivated. Contact an administrator.')
      }
      setLastActivity()
      return cred.user
    } finally {
      loginInProgress = false
    }
  }

  async function logout() {
    await signOut(auth)
    clearLastActivity()
    user.value = null
    profile.value = null
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email)
  }

  async function updateUserProfile(data) {
    if (!user.value) return
    const { displayName: name, phone, ...rest } = data
    if (name) {
      await updateProfile(user.value, { displayName: name })
    }
    await updateDoc(doc(db, COLLECTIONS.USERS, user.value.uid), {
      ...(name !== undefined ? { displayName: name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...rest,
      updatedAt: serverTimestamp(),
    })
    await loadProfile(user.value.uid)
  }

  async function uploadProfilePhoto(file) {
    if (!user.value) return

    const compressed = await compressProfileImage(file)
    const path = `profiles/${user.value.uid}/avatar_${Date.now()}.jpg`
    const fileRef = storageRef(storage, path)

    if (profile.value?.photoPath) {
      try {
        await deleteObject(storageRef(storage, profile.value.photoPath))
      } catch {
        // previous photo may already be deleted
      }
    }

    await uploadBytes(fileRef, compressed, { contentType: compressed.type || 'image/jpeg' })
    const photoUrlValue = await getDownloadURL(fileRef)

    await updateProfile(user.value, { photoURL: photoUrlValue })
    await updateDoc(doc(db, COLLECTIONS.USERS, user.value.uid), {
      photoUrl: photoUrlValue,
      photoPath: path,
      updatedAt: serverTimestamp(),
    })
    await loadProfile(user.value.uid)
    return photoUrlValue
  }

  async function removeProfilePhoto() {
    if (!user.value) return

    if (profile.value?.photoPath) {
      try {
        await deleteObject(storageRef(storage, profile.value.photoPath))
      } catch {
        // ignore missing file
      }
    }

    await updateProfile(user.value, { photoURL: null })
    await updateDoc(doc(db, COLLECTIONS.USERS, user.value.uid), {
      photoUrl: null,
      photoPath: null,
      updatedAt: serverTimestamp(),
    })
    await loadProfile(user.value.uid)
  }

  async function createStaffAccount({ email, password, displayName, role: staffRole, phone }) {
    const secondaryAuth = getSecondaryAuth()
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
      email,
      displayName,
      role: staffRole,
      phone: phone || '',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await signOut(secondaryAuth)
    return cred.user.uid
  }

  function hasRole(...roles) {
    return roles.includes(role.value)
  }

  function canAccess(routeRoles) {
    if (!routeRoles || routeRoles.length === 0) return true
    return routeRoles.includes(role.value)
  }

  return {
    user, profile, loading, isAuthenticated, role, isAdmin, isDentist, isAssistant,
    displayName, photoUrl, init, login, logout, resetPassword, updateUserProfile,
    uploadProfilePhoto, removeProfilePhoto, createStaffAccount,
    loadProfile, hasRole, canAccess,
  }
})
