/** Minimal IndexedDB blob store — used by demo mode to keep uploaded files in this browser. */
const DB_NAME = 'trippy-demo'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const blobStore = {
  put: (key: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, key)).then(() => undefined),
  get: (key: string) => tx<Blob | undefined>('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>),
  delete: (key: string) => tx('readwrite', (s) => s.delete(key)).then(() => undefined),
}
