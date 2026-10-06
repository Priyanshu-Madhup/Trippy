/**
 * Logo resolver — works for any airline / booking platform / operator without
 * hard-coded lists: provider → normalised domain / IATA code → logo URL.
 *
 * Candidates are probed server-side so the client never renders a broken or
 * placeholder image; the client still falls back to a monogram on error.
 */
import type { ResolvedLogo } from '../../src/types/extraction.js'
import { fetchWithTimeout, memoryCache } from './http.js'

export interface LogoQuery {
  name: string | null
  domain: string | null
  iata: string | null
  kind: 'airline' | 'platform' | 'provider'
}

const cache = memoryCache<ResolvedLogo>(2000)

interface Probe {
  ok: boolean
  size: number
  head: string
}

async function probe(url: string): Promise<Probe> {
  try {
    const res = await fetchWithTimeout(url, { redirect: 'follow' }, 4500)
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return { ok: false, size: 0, head: '' }
    const buf = new Uint8Array(await res.arrayBuffer())
    return { ok: buf.byteLength > 300, size: buf.byteLength, head: Buffer.from(buf.slice(0, 64)).toString('hex') }
  } catch {
    return { ok: false, size: 0, head: '' }
  }
}

// The airline CDN returns a generic placeholder (HTTP 200) for unknown codes —
// learn its signature once by asking for an invalid code.
let airlinePlaceholder: Promise<Probe> | null = null
const airlineLogoUrl = (code: string) => `https://images.kiwi.com/airlines/128x128/${code}.png`

async function airlineByIata(code: string): Promise<string | null> {
  airlinePlaceholder ??= probe(airlineLogoUrl('ZZ'))
  const [placeholder, candidate] = await Promise.all([airlinePlaceholder, probe(airlineLogoUrl(code))])
  if (!candidate.ok) return null
  if (placeholder.ok && placeholder.size === candidate.size && placeholder.head === candidate.head) return null
  return airlineLogoUrl(code)
}

async function byDomain(domain: string): Promise<{ url: string; source: string } | null> {
  const token = process.env.LOGO_DEV_TOKEN
  const candidates: { url: string; source: string }[] = []
  if (token) {
    candidates.push({
      url: `https://img.logo.dev/${domain}?token=${encodeURIComponent(token)}&size=128&format=png&retina=true&fallback=404`,
      source: 'logo.dev',
    })
  }
  candidates.push(
    { url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`, source: 'google_favicon' },
    { url: `https://icons.duckduckgo.com/ip3/${domain}.ico`, source: 'duckduckgo' },
  )
  for (const c of candidates) {
    if ((await probe(c.url)).ok) return c
  }
  return null
}

export async function resolveLogo(q: LogoQuery): Promise<ResolvedLogo> {
  const iata = q.iata?.toUpperCase().replace(/[^A-Z0-9]/g, '') || null
  const domain = q.domain?.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || null
  const key = `${q.kind}:${iata ?? ''}:${domain ?? ''}:${(q.name ?? '').toLowerCase()}`
  const cached = cache.get(key)
  if (cached) return cached

  let result: ResolvedLogo = { url: null, source: null, domain }

  if (q.kind === 'airline' && iata && iata.length === 2) {
    const url = await airlineByIata(iata)
    if (url) result = { url, source: 'airline_cdn', domain }
  }
  if (!result.url && domain && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    const hit = await byDomain(domain)
    if (hit) result = { url: hit.url, source: hit.source, domain }
  }

  cache.set(key, result, result.url ? 7 * 86_400_000 : 3_600_000)
  return result
}
