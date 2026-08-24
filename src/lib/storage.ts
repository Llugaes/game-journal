import type { Entry } from '../types'

const ENTRIES_KEY = 'game-journal.entries.v1'
const DB_NAME = 'game-journal-assets'
const STORE = 'images'

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function readEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY)
    const entries = raw ? JSON.parse(raw) : []
    return Array.isArray(entries) ? entries : []
  } catch {
    return []
  }
}

function writeEntries(entries: Entry[]) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
}

export async function saveEntry(entry: Entry, images: File[]) {
  const db = await database()
  await Promise.all(images.map((image, index) => new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(image, entry.imageIds[index])
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })))
  db.close()
  writeEntries([entry, ...readEntries().filter(item => item.id !== entry.id)])
}

export async function imageUrl(id: string): Promise<string | null> {
  const db = await database()
  const file = await new Promise<Blob | null>((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return file ? URL.createObjectURL(file) : null
}

export async function deleteEntry(entry: Entry) {
  const db = await database()
  await Promise.all(entry.imageIds.map(id => new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })))
  db.close()
  writeEntries(readEntries().filter(item => item.id !== entry.id))
}
