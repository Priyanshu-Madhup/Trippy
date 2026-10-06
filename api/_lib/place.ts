/**
 * Destination info for the dashboard: weather, news and a short overview.
 *
 *   weather: DuckDuckGo forecast (Apple WeatherKit data) → Open-Meteo fallback
 *   news:    DuckDuckGo News → Google News RSS fallback
 *   about:   Wikipedia summary
 *
 * DuckDuckGo endpoints are unofficial, so every source fails soft.
 */
import type { PlaceInfo, PlaceNewsItem, PlaceWeather } from '../../src/types/place.js'
import { USER_AGENT, fetchWithTimeout, memoryCache } from './http.js'

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
const cache = memoryCache<PlaceInfo>(300)

async function text(url: string, init: RequestInit = {}, timeout = 7000): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, { ...init, headers: { 'user-agent': BROWSER_UA, ...(init.headers ?? {}) } }, timeout)
    return res.ok ? await res.text() : null
  } catch {
    return null
  }
}

// ─── Weather ────────────────────────────────────────────────────────

interface DdgForecast {
  currentWeather?: {
    temperature: number
    temperatureApparent?: number
    conditionCode: string
    humidity?: number
    windSpeed?: number
    daylight?: boolean
  }
  forecastDaily?: {
    days?: { forecastStart: string; conditionCode: string; temperatureMin: number; temperatureMax: number; precipitationChance?: number }[]
  }
  location?: string
}

async function ddgWeather(place: string): Promise<PlaceWeather | null> {
  const raw = await text(`https://duckduckgo.com/js/spice/forecast/${encodeURIComponent(place)}/en`)
  if (!raw) return null
  const body = raw.replace(/^[^(]*\(/, '').replace(/\);?\s*$/, '')
  try {
    const d = JSON.parse(body) as DdgForecast
    const c = d.currentWeather
    if (!c || typeof c.temperature !== 'number') return null
    return {
      source: 'duckduckgo',
      location: typeof d.location === 'string' ? d.location : null,
      current: {
        temperature: c.temperature,
        feelsLike: c.temperatureApparent ?? null,
        condition: c.conditionCode,
        humidity: c.humidity ?? null,
        wind: c.windSpeed ?? null,
        daylight: c.daylight ?? true,
      },
      days: (d.forecastDaily?.days ?? []).slice(0, 7).map((x) => ({
        date: new Date(Date.parse(x.forecastStart) + 12 * 3600_000).toISOString().slice(0, 10),
        condition: x.conditionCode,
        min: x.temperatureMin,
        max: x.temperatureMax,
        precipChance: x.precipitationChance ?? null,
      })),
    }
  } catch {
    return null
  }
}

// WMO weather codes → the WeatherKit-style condition names used by the UI.
function wmo(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'PartlyCloudy'
  if (code === 3) return 'Cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67 || (code >= 80 && code <= 82)) return 'Rain'
  if (code <= 77 || code === 85 || code === 86) return 'Snow'
  return 'Thunderstorms'
}

async function openMeteo(place: string): Promise<PlaceWeather | null> {
  const geoRaw = await text(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(place)}`)
  if (!geoRaw) return null
  try {
    const geo = (JSON.parse(geoRaw) as { results?: { latitude: number; longitude: number; name: string; country?: string }[] }).results?.[0]
    if (!geo) return null
    const raw = await text(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&timezone=auto&forecast_days=7` +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    )
    if (!raw) return null
    const d = JSON.parse(raw) as {
      current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; weather_code: number; wind_speed_10m: number; is_day: number }
      daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[] }
    }
    return {
      source: 'open-meteo',
      location: [geo.name, geo.country].filter(Boolean).join(', '),
      current: {
        temperature: d.current.temperature_2m,
        feelsLike: d.current.apparent_temperature,
        condition: wmo(d.current.weather_code),
        humidity: d.current.relative_humidity_2m / 100,
        wind: d.current.wind_speed_10m,
        daylight: d.current.is_day === 1,
      },
      days: d.daily.time.map((date, i) => ({
        date,
        condition: wmo(d.daily.weather_code[i]),
        min: d.daily.temperature_2m_min[i],
        max: d.daily.temperature_2m_max[i],
        precipChance: d.daily.precipitation_probability_max[i] != null ? (d.daily.precipitation_probability_max[i] as number) / 100 : null,
      })),
    }
  } catch {
    return null
  }
}

// ─── News ───────────────────────────────────────────────────────────

async function ddgNews(place: string): Promise<PlaceNewsItem[]> {
  const page = await text(`https://duckduckgo.com/?q=${encodeURIComponent(place)}&ia=news&iar=news`)
  const vqd = page?.match(/vqd=["']?([\d-]+)/)?.[1]
  if (!vqd) return []
  const raw = await text(
    `https://duckduckgo.com/news.js?l=wt-wt&o=json&noamp=1&p=-1&df=w&q=${encodeURIComponent(place)}&vqd=${vqd}`,
    { headers: { referer: 'https://duckduckgo.com/', accept: 'application/json, text/javascript, */*; q=0.01' } },
  )
  if (!raw) return []
  try {
    const d = JSON.parse(raw) as {
      results?: { title: string; url: string; source?: string; date?: number; image?: string; excerpt?: string }[]
    }
    return (d.results ?? []).slice(0, 8).map((r) => ({
      title: decode(r.title),
      url: r.url,
      source: r.source ?? null,
      date: r.date ? new Date(r.date * 1000).toISOString() : null,
      image: r.image && r.image.startsWith('http') ? r.image : null,
      excerpt: r.excerpt ? decode(r.excerpt).slice(0, 220) : null,
    }))
  } catch {
    return []
  }
}

async function googleNews(place: string): Promise<PlaceNewsItem[]> {
  const xml = await text(`https://news.google.com/rss/search?q=${encodeURIComponent(place)}&hl=en&gl=US&ceid=US:en`)
  if (!xml) return []
  const items = xml.split('<item>').slice(1, 9)
  return items.map((item) => {
    const tag = (t: string) => item.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() ?? null
    const source = tag('source')
    const title = decode(tag('title') ?? '').replace(source ? ` - ${source}` : /$^/, '')
    const pub = tag('pubDate')
    return { title, url: tag('link') ?? '', source, date: pub ? new Date(pub).toISOString() : null, image: null, excerpt: null }
  }).filter((n) => n.title && n.url)
}

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

// ─── About ──────────────────────────────────────────────────────────

async function wikipedia(place: string): Promise<PlaceInfo['about']> {
  try {
    const res = await fetchWithTimeout(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.replace(/ /g, '_'))}?redirect=true`,
      { headers: { 'user-agent': USER_AGENT } },
      6000,
    )
    if (!res.ok) return null
    const d = (await res.json()) as {
      type?: string
      title: string
      extract?: string
      content_urls?: { desktop?: { page?: string } }
      thumbnail?: { source: string }
    }
    if (!d.extract || d.type === 'disambiguation') return null
    return {
      title: d.title,
      extract: d.extract,
      url: d.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(d.title)}`,
      image: d.thumbnail?.source ?? null,
    }
  } catch {
    return null
  }
}

// ─── Public ─────────────────────────────────────────────────────────

export async function getPlaceInfo(place: string): Promise<PlaceInfo> {
  const q = place.trim().slice(0, 80)
  const key = q.toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit

  const [weather, news, about] = await Promise.all([
    ddgWeather(q).then((w) => w ?? openMeteo(q)),
    ddgNews(q).then((n) => (n.length ? n : googleNews(q))),
    wikipedia(q),
  ])
  const info: PlaceInfo = { query: q, weather, news, about }
  // Weather & news go stale quickly; keep them for 20 minutes per warm instance.
  // Partial/failed lookups are only kept briefly so a transient error doesn't stick.
  const complete = !!weather && news.length > 0
  cache.set(key, info, complete ? 20 * 60_000 : 2 * 60_000)
  return info
}
