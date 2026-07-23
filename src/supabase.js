import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from('kv')
      .select('value')
      .eq('key', key)
      .single()
    if (error || !data) return null
    return { value: data.value }
  },
  async set(key, value) {
    await supabase.from('kv').upsert({ key, value })
  }
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

async function compressImage(file, maxPx = 1200, quality = 0.65) {
  return new Promise((resolve) => {
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
    // update path extension for compressed images
    path = path.replace(/\.\w+$/, '.jpg')
  }
  const { error } = await supabase.storage
    .from('attachments')
    .upload(path, toUpload, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
  return urlData.publicUrl
}

export async function deleteFile(path) {
  await supabase.storage.from('attachments').remove([path])
}
