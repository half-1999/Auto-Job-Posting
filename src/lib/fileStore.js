/** One resume PDF in IndexedDB. The bytes never go to LocalStorage. */

const DB_NAME = 'jaas'
const STORE = 'files'
const KEY = 'resume'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestStore(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(request?.result)
        tx.onerror = () => reject(tx.error)
      }),
  )
}

export function saveResume({ name, size, savedAt, file }) {
  if (!(file instanceof Blob)) return Promise.reject(new Error('Choose a PDF file'))
  return requestStore('readwrite', (store) => store.put({ name, size, savedAt, blob: file }, KEY))
}

export async function loadResume() {
  const record = await requestStore('readonly', (store) => store.get(KEY))
  if (!record?.blob) return null
  return {
    name: record.name,
    size: record.size,
    savedAt: record.savedAt,
    file: new File([record.blob], record.name, { type: 'application/pdf' }),
  }
}

export function clearResume() {
  return requestStore('readwrite', (store) => store.delete(KEY))
}
