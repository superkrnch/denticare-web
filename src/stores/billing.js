import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, PAYMENT_STATUS } from '@/constants'
import { generateId } from '@/utils/helpers'
import { useActivityStore } from './activities'
import { useAuthStore } from './auth'

export const useBillingStore = defineStore('billing', () => {
  const billings = ref([])
  const loading = ref(false)

  function computePaymentStatus(total, paid) {
    if (paid <= 0) return PAYMENT_STATUS.UNPAID
    if (paid >= total) return PAYMENT_STATUS.PAID
    return PAYMENT_STATUS.PARTIAL
  }

  function buildPaymentEntry({ amount, method, notes = '' }) {
    const auth = useAuthStore()
    return {
      id: generateId('PAY'),
      amount: Number(amount),
      method,
      notes: notes || '',
      recordedBy: auth.user?.uid || '',
      recordedByName: auth.displayName || 'Staff',
      recordedAt: new Date().toISOString(),
    }
  }

  async function fetchBillings() {
    loading.value = true
    const snap = await getDocs(query(collection(db, COLLECTIONS.BILLINGS), orderBy('createdAt', 'desc')))
    billings.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    loading.value = false
  }

  async function fetchByPatient(patientId) {
    loading.value = true
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.BILLINGS), where('patientId', '==', patientId), orderBy('createdAt', 'desc')),
    )
    billings.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    loading.value = false
  }

  async function createInvoice(data) {
    const activities = useActivityStore()
    const totalAmount = (data.treatments || []).reduce((sum, t) => sum + (Number(t.cost) || 0), 0)
    const paidAmount = Number(data.paidAmount) || 0
    const remainingBalance = totalAmount - paidAmount

    const payments = []
    if (paidAmount > 0) {
      if (!data.paymentMethod) {
        throw new Error('Select a payment method for the initial payment.')
      }
      payments.push(buildPaymentEntry({
        amount: paidAmount,
        method: data.paymentMethod,
        notes: data.paymentNotes,
      }))
    }

    const payload = {
      patientId: data.patientId,
      patientName: data.patientName,
      treatments: (data.treatments || []).map((item) => ({
        procedureName: item.procedureName,
        toothNumber: item.toothNumber ?? null,
        cost: Number(item.cost) || 0,
      })),
      invoiceNumber: generateId('INV'),
      totalAmount,
      paidAmount,
      remainingBalance,
      paymentStatus: computePaymentStatus(totalAmount, paidAmount),
      payments,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const ref = await addDoc(collection(db, COLLECTIONS.BILLINGS), payload)
    await activities.log('billing', `Created invoice ${payload.invoiceNumber}`, { patientId: data.patientId })
    return ref.id
  }

  async function recordPayment(id, { amount, method, notes = '' }) {
    const activities = useActivityStore()
    const snap = await getDoc(doc(db, COLLECTIONS.BILLINGS, id))
    if (!snap.exists()) return

    const data = snap.data()
    const paymentAmount = Number(amount)
    if (!paymentAmount || paymentAmount <= 0) {
      throw new Error('Enter a valid payment amount.')
    }
    if (!method) {
      throw new Error('Select a payment method.')
    }
    if (paymentAmount > (data.remainingBalance || 0)) {
      throw new Error('Payment amount cannot exceed the remaining balance.')
    }

    const paidAmount = (data.paidAmount || 0) + paymentAmount
    const remainingBalance = data.totalAmount - paidAmount
    const payments = [...(data.payments || []), buildPaymentEntry({ amount: paymentAmount, method, notes })]

    await updateDoc(doc(db, COLLECTIONS.BILLINGS, id), {
      paidAmount,
      remainingBalance,
      paymentStatus: computePaymentStatus(data.totalAmount, paidAmount),
      payments,
      updatedAt: serverTimestamp(),
    })

    await activities.log('billing', `Recorded payment on ${data.invoiceNumber}`, { patientId: data.patientId })
  }

  function getMonthlyRevenue() {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    return billings.value
      .filter((b) => {
        const d = b.createdAt?.toDate?.() || new Date(b.createdAt)
        return d.getMonth() === month && d.getFullYear() === year
      })
      .reduce((sum, b) => sum + (b.paidAmount || 0), 0)
  }

  return {
    billings, loading, fetchBillings, fetchByPatient, createInvoice,
    recordPayment, getMonthlyRevenue, computePaymentStatus,
  }
})
