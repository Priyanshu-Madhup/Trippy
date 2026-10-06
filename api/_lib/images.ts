/**
 * Image resolver — finds a beautiful photo for a destination, hotel or venue.
 *
 * Source order (each optional source is skipped when its key is missing):
 *   destination: Unsplash → Pexels → Wikipedia lead image → Wikipedia search
 *   hotel:       Google Places photo → Wikipedia (exact article only)
 *   place:       Wikipedia → Unsplash → Pexels
 */
import type { ResolvedImage } from '../../src/types/extraction.js'
import { USER_AGENT, fetchWithTimeout, memoryCache } from './http.js'

export type ImageKind = 'destination' | 'hotel' | 'place'

const cache = memoryCache<ResolvedImage>(1000)
const NONE: ResolvedImage = { url: null, source: null, attribution: null }

const BAD_IMAGE = /\.svg|flag_of|coat_of_arms|locator|location_map|_map\.|map_of|logo|seal_of|emblem|blank|icon/i

async function getJson<T>(url: string, init?: RequestInit, timeoutMs = 6000): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(url, init, timeoutMs)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ─── Unsplash ───────────────────────────────────────────────────────

async function unsplash(query: string): Promise<ResolvedImage | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
  const data = await getJson<{
    results?: { urls: { raw: string }; user: { name: string }; width: number; height: number }[]
  }>(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=6&content_filter=high&order_by=relevant`,
    { headers: { authorization: `Client-ID ${key}`, 'accept-version': 'v1' } },
  )
  const photo = data?.results?.find((p) => p.width >= p.height)
  if (!photo) return null
  return {
    url: `${photo.urls.raw}&w=1800&q=80&auto=format&fit=crop`,
    source: 'unsplash',
    attribution: `Photo by ${photo.user.name} on Unsplash`,
  }
}

// ─── Pexels ─────────────────────────────────────────────────────────

async function pexels(query: string): Promise<ResolvedImage | null> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return null
  const data = await getJson<{ photos?: { src: { large2x: string }; photographer: string }[] }>(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`,
    { headers: { authorization: key } },
  )
  const photo = data?.photos?.[0]
  if (!photo) return null
  return { url: photo.src.large2x, source: 'pexels', attribution: `Photo by ${photo.photographer} on Pexels` }
}

// ─── Google Places (hotels) ─────────────────────────────────────────

async function googlePlaces(query: string): Promise<ResolvedImage | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return null
  const search = await getJson<{ places?: { photos?: { name: string; authorAttributions?: { displayName: string }[] }[] }[] }>(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': key,
        'x-goog-fieldmask': 'places.photos',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    },
  )
  const photo = search?.places?.[0]?.photos?.[0]
  if (!photo) return null
  // skipHttpRedirect returns a key-less googleusercontent URL that is safe to hand to the browser.
  const media = await getJson<{ photoUri?: string }>(
    `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1600&skipHttpRedirect=true`,
    { headers: { 'x-goog-api-key': key } },
  )
  if (!media?.photoUri) return null
  const author = photo.authorAttributions?.[0]?.displayName
  return { url: media.photoUri, source: 'google_places', attribution: author ? `Photo by ${author} · Google` : 'Google' }
}

// ─── Wikipedia / Wikimedia (keyless) ────────────────────────────────

interface WikiPage {
  title: string
  index?: number
  thumbnail?: { source: string; width: number; height: number }
  pageimage?: string
}

function pickWikiImage(pages: WikiPage[], opts: { landscape: boolean }): ResolvedImage | null {
  const sorted = [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  for (const page of sorted) {
    const t = page.thumbnail
    if (!t || BAD_IMAGE.test(page.pageimage ?? t.source)) continue
    if (t.width < 640) continue
    if (opts.landscape && t.width < t.height * 1.1) continue
    return { url: t.source, source: 'wikipedia', attribution: `Wikimedia Commons · ${page.title}` }
  }
  return null
}

async function wikipediaTitle(title: string, mustMatch?: string): Promise<ResolvedImage | null> {
  const data = await getJson<{ query?: { pages?: Record<string, WikiPage & { missing?: string }> } }>(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&pithumbsize=1800&titles=${encodeURIComponent(title)}`,
    { headers: { 'user-agent': USER_AGENT } },
  )
  const pages = Object.values(data?.query?.pages ?? {}).filter((p) => !('missing' in p))
  if (mustMatch) {
    const want = mustMatch.toLowerCase().split(/\s+/)[0]
    if (!pages.some((p) => p.title.toLowerCase().includes(want))) return null
  }
  return pickWikiImage(pages, { landscape: false })
}

async function wikipediaSearch(query: string): Promise<ResolvedImage | null> {
  const data = await getJson<{ query?: { pages?: Record<string, WikiPage> } }>(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=8&prop=pageimages&pithumbsize=1800&gsrsearch=${encodeURIComponent(query)}`,
    { headers: { 'user-agent': USER_AGENT } },
  )
  return pickWikiImage(Object.values(data?.query?.pages ?? {}), { landscape: true })
}

// ─── Public API ─────────────────────────────────────────────────────

async function firstHit(tasks: (() => Promise<ResolvedImage | null>)[]): Promise<ResolvedImage> {
  for (const task of tasks) {
    const hit = await task()
    if (hit?.url) return hit
  }
  return NONE
}

export async function resolveImage(query: string, kind: ImageKind, context?: string | null): Promise<ResolvedImage> {
  const q = query.trim().slice(0, 120)
  const ctx = context?.trim().slice(0, 80) || ''
  const key = `${kind}:${q.toLowerCase()}:${ctx.toLowerCase()}`
  const cached = cache.get(key)
  if (cached) return cached

  let result: ResolvedImage
  if (kind === 'destination') {
    const photoQuery = /skyline|landmark|view|city/i.test(q) ? q : `${q} skyline`
    const place = q.replace(/\s+(skyline|landmark|cityscape|city)\b.*$/i, '')
    result = await firstHit([
      () => unsplash(photoQuery),
      () => pexels(photoQuery),
      () => wikipediaTitle(place),
      () => wikipediaSearch(`${place} skyline`),
      () => wikipediaSearch(place),
    ])
  } else if (kind === 'hotel') {
    const full = ctx ? `${q} ${ctx}` : q
    result = await firstHit([() => googlePlaces(full), () => wikipediaTitle(q, q)])
  } else {
    const full = ctx ? `${q} ${ctx}` : q
    result = await firstHit([() => wikipediaTitle(q, q), () => unsplash(full), () => pexels(full)])
  }

  cache.set(key, result, result.url ? 7 * 86_400_000 : 3_600_000)
  return result
}
