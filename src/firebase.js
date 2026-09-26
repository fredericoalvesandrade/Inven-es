import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app     = initializeApp(firebaseConfig)
const db      = getFirestore(app)
const bucket  = getStorage(app)

export const storage = {
  async get(key) {
    const snap = await getDoc(doc(db, 'kv', key))
    if (!snap.exists()) return null
    return { value: snap.data().value }
  },
  async set(key, value) {
    await setDoc(doc(db, 'kv', key), { value })
  }
}

const MAX_FILE_BYTES = 10 * 1024 * 1024

async function compressImage(file, maxPx = 1200, quality = 0.65) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export async function uploadFile(file, path) {
  if (file.size > MAX_FILE_BYTES) throw new Error('Ficheiro demasiado grande (máx. 10 MB)')
  let toUpload = file
  if (file.type.startsWith('image/')) {
    toUpload = await compressImage(file)
    path = path.replace(/\.\w+$/, '.jpg')
  }
  const fileRef = ref(bucket, path)
  await uploadBytes(fileRef, toUpload)
  return getDownloadURL(fileRef)
}

export async function deleteFile(path) {
  try { await deleteObject(ref(bucket, path)) } catch (_) {}
}
