import { HttpError, fetchWithTimeout } from './http.js'

export interface AuthedUser {
  id: string
  email: string | null
}

const cache = new Map<string, { user: AuthedUser; expires: number }>()

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''
  const configured = /^https:\/\/.+/.test(url) && !url.includes('your-project') && anonKey.length > 20 && !anonKey.startsWith('your-')
  return { url: url.replace(/\/$/, ''), anonKey, configured }
}

/**
 * Verifies the caller's Supabase access token by asking Supabase Auth who it
 * belongs to. Only the public anon key is needed — never the service role.
 *
 * Local demo mode (no Supabase configured AND not running on Vercel) is let
 * through so the app can be explored without a backend.
 */
export async function requireUser(request: Request): Promise<AuthedUser> {
  const { url, anonKey, configured } = supabaseConfig()

  if (!configured) {
    if (!process.env.VERCEL) return { id: 'demo-user', email: null }
    throw new HttpError(500, 'server_not_configured', 'Supabase is not configured on the server.')
  }

  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new HttpError(401, 'unauthorized', 'Sign in to continue.')

  const cached = cache.get(token)
  if (cached && cached.expires > Date.now()) return cached.user

  const res = await fetchWithTimeout(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new HttpError(401, 'unauthorized', 'Your session has expired. Please sign in again.')

  const body = (await res.json()) as { id?: string; email?: string }
  if (!body.id) throw new HttpError(401, 'unauthorized', 'Sign in to continue.')

  const user = { id: body.id, email: body.email ?? null }
  if (cache.size > 1000) cache.clear()
  cache.set(token, { user, expires: Date.now() + 60_000 })
  return user
}
