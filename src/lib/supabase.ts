import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isDemoMode } from './env'

/** Browser Supabase client — uses the public anon key only. RLS protects all data. */
export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'trippy.auth' },
    })

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export const TICKETS_BUCKET = 'tickets'
