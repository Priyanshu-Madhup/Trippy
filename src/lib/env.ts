const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

export const env = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
}

/**
 * When Supabase isn't configured (the .env still has placeholders) the app
 * runs in local demo mode: data lives in this browser only and is seeded with
 * sample trips so the product can be explored immediately.
 */
export const isDemoMode = !/^https:\/\/.+/.test(url) || url.includes('your-project') || anonKey.length < 20 || anonKey.startsWith('your-')
