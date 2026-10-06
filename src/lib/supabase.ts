import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Implicit flow so magic links work when opened from the phone's mail app
    // (PKCE requires the code verifier in the same browser that requested the link).
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
})
