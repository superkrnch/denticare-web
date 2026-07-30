const DB_NAME = 'denticare-xrays'
const STORE_NAME = 'images'
const DB_VERSION = 1

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runTransaction(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)

        const result = fn(store)

        tx.oncomplete = () => {
          db.close()
          resolve(result)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }),
  )
}

export async function saveLocalXrayImage(id, blob) {
  await runTransaction('readwrite', (store) => store.put(blob, id))
}

export async function getLocalXrayImage(id) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const request = tx.objectStore(STORE_NAME).get(id)

        request.onsuccess = () => {
          db.close()
          resolve(request.result || null)
        }
        request.onerror = () => {
          db.close()
          reject(request.error)
        }
      }),
  )
}

export async function deleteLocalXrayImage(id) {
  await runTransaction('readwrite', (store) => store.delete(id))
}

export function createObjectUrl(blob) {
  return URL.createObjectURL(blob)
}

export function revokeObjectUrl(url) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
