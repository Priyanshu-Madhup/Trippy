/** Contract for /api/place-info — shared by the browser and the API. */

export interface WeatherDay {
  date: string
  condition: string
  min: number
  max: number
  precipChance: number | null
}

export interface PlaceWeather {
  source: 'duckduckgo' | 'open-meteo'
  location: string | null
  current: { temperature: number; feelsLike: number | null; condition: string; humidity: number | null; wind: number | null; daylight: boolean }
  days: WeatherDay[]
}

export interface PlaceNewsItem {
  title: string
  url: string
  source: string | null
  date: string | null
  image: string | null
  excerpt: string | null
}

export interface PlaceInfo {
  query: string
  weather: PlaceWeather | null
  news: PlaceNewsItem[]
  about: { title: string; extract: string; url: string; image: string | null } | null
}
