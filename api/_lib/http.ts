/** Small helpers for Web-standard Request/Response handlers. */

export class HttpError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message?: string) {
    super(message ?? code)
    this.status = status
    this.code = code
  }
}

export function json(data: unknown, init: ResponseInit & { cache?: string } = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', init.cache ?? 'no-store')
  return new Response(JSON.stringify(data), { status: init.status, headers })
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return json({ error: err.code, message: err.message }, { status: err.status })
  }
  console.error('[api] unexpected error', err)
  return json({ error: 'internal_error', message: 'Something went wrong. Please try again.' }, { status: 500 })
}

export async function readJson<T>(request: Request, maxBytes = 4_000_000): Promise<T> {
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > maxBytes) throw new HttpError(413, 'payload_too_large', 'The document is too large to process.')
  const text = await request.text()
  if (text.length > maxBytes) throw new HttpError(413, 'payload_too_large', 'The document is too large to process.')
  try {
    return JSON.parse(text) as T
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be JSON.')
  }
}

export async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Tiny per-instance cache — warm Vercel instances reuse it between requests. */
export function memoryCache<V>(max = 500) {
  const map = new Map<string, { value: V; expires: number }>()
  return {
    get(key: string): V | undefined {
      const hit = map.get(key)
      if (!hit) return undefined
      if (hit.expires < Date.now()) {
        map.delete(key)
        return undefined
      }
      return hit.value
    },
    set(key: string, value: V, ttlMs = 24 * 60 * 60 * 1000) {
      if (map.size >= max) map.delete(map.keys().next().value as string)
      map.set(key, { value, expires: Date.now() + ttlMs })
    },
  }
}

export const USER_AGENT = 'Trippy/1.0 (travel document organizer; https://vercel.com)'
