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

export async function uploadFile(file, path) {
  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
  return urlData.publicUrl
}

export async function deleteFile(path) {
  await supabase.storage.from('attachments').remove([path])
}
