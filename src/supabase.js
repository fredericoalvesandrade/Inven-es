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
