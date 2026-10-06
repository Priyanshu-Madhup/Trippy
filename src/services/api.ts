import { backend } from './backend'

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** Calls our Vercel functions with the user's Supabase access token. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await backend.getAccessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')

  let res: Response
  try {
    res = await fetch(path, { ...init, headers })
  } catch {
    throw new ApiError(0, 'network', 'You appear to be offline.')
  }

  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON (e.g. platform error page) */
  }

  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; message?: string }
    throw new ApiError(res.status, b.error ?? 'error', b.message ?? `Request failed (${res.status}).`)
  }
  return body as T
}
