/**
 * Client-side resolver facade with a persistent cache, so the same provider or
 * destination is never looked up twice. All lookups go through /api — no keys
 * in the browser — and every function resolves to `null` instead of throwing.
 */
import type { ResolvedImage, ResolvedLogo } from '@/types/extraction'
import { apiFetch } from './api'

const CACHE_KEY = 'trippy.resolver.v1'
const TTL = 7 * 86_400_000

type Entry = { v: string | null; a?: string | null; s?: string | null; t: number }

let memory: Record<string, Entry> | null = null
const inflight = new Map<string, Promise<Entry>>()

function cache(): Record<string, Entry> {
  if (memory) return memory
  try {
    memory = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, Entry>
  } catch {
    memory = {}
  }
  return memory
}

function persist() {
  try {
    const entries = Object.entries(cache())
    // Keep the cache bounded.
    const trimmed = entries.sort((a, b) => b[1].t - a[1].t).slice(0, 400)
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)))
  } catch {
    /* storage full / unavailable */
  }
}

async function cached(key: string, load: () => Promise<Entry>): Promise<Entry> {
  const hit = cache()[key]
  // Negative results expire after an hour so transient failures recover.
  if (hit && Date.now() - hit.t < (hit.v ? TTL : 3_600_000)) return hit
  const pending = inflight.get(key)
  if (pending) return pending
  const p = load()
    .catch((): Entry => ({ v: null, t: Date.now() }))
    .then((entry) => {
      cache()[key] = entry
      persist()
      inflight.delete(key)
      return entry
    })
  inflight.set(key, p)
  return p
}

function normalize(s: string | null | undefined) {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export interface LogoRequest {
  name: string | null
  domain?: string | null
  iata?: string | null
  kind: 'airline' | 'platform' | 'provider'
}

/** Provider → normalised domain / IATA code → verified logo URL (or null → monogram). */
export async function resolveProviderLogo(req: LogoRequest): Promise<string | null> {
  if (!req.domain && !req.iata) return null
  const key = `logo:${req.kind}:${normalize(req.iata)}:${normalize(req.domain)}`
  const entry = await cached(key, async () => {
    const params = new URLSearchParams({ kind: req.kind })
    if (req.name) params.set('name', req.name)
    if (req.domain) params.set('domain', req.domain)
    if (req.iata) params.set('iata', req.iata)
    const res = await apiFetch<ResolvedLogo>(`/api/resolve-logo?${params}`)
    return { v: res.url, s: res.source, t: Date.now() }
  })
  return entry.v
}

export interface ImageResult {
  url: string | null
  source: string | null
  attribution: string | null
}

async function resolveImage(q: string, kind: 'destination' | 'hotel' | 'place', context?: string | null): Promise<ImageResult> {
  const key = `img:${kind}:${normalize(q)}:${normalize(context)}`
  const entry = await cached(key, async () => {
    const params = new URLSearchParams({ q, kind })
    if (context) params.set('context', context)
    const res = await apiFetch<ResolvedImage>(`/api/resolve-image?${params}`)
    return { v: res.url, s: res.source, a: res.attribution, t: Date.now() }
  })
  return { url: entry.v, source: entry.s ?? null, attribution: entry.a ?? null }
}

export function resolveDestinationImage(query: string): Promise<ImageResult> {
  return resolveImage(query, 'destination')
}

/** Hotel photo, falling back to a photo of the hotel's city. */
export async function resolveHotelImage(hotelName: string, city: string | null): Promise<ImageResult> {
  const hotel = await resolveImage(hotelName, 'hotel', city)
  if (hotel.url || !city) return hotel
  return resolveDestinationImage(city)
}

export async function resolvePlaceImage(name: string, city: string | null): Promise<ImageResult> {
  const place = await resolveImage(name, 'place', city)
  if (place.url || !city) return place
  return resolveDestinationImage(city)
}
