import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}

export function initials(name: string | null | undefined, fallback = '?'): string {
  if (!name) return fallback
  const parts = name.trim().split(/[\s&-]+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Stable hash → hue, used for monograms and destination gradients. */
export function hashHue(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

export function gradientFor(seed: string): string {
  const hue = hashHue(seed || 'trip')
  const hue2 = (hue + 38) % 360
  return `linear-gradient(135deg, hsl(${hue} 42% 32%) 0%, hsl(${hue2} 48% 46%) 55%, hsl(${(hue2 + 30) % 360} 60% 70%) 100%)`
}

let regionIndex: Map<string, string> | null = null

/** Country name → ISO alpha-2, built from Intl (no hard-coded table). */
export function countryCodeFromName(name: string | null | undefined): string | null {
  if (!name) return null
  if (!regionIndex) {
    regionIndex = new Map()
    try {
      const display = new Intl.DisplayNames(['en'], { type: 'region' })
      for (let a = 65; a <= 90; a++) {
        for (let b = 65; b <= 90; b++) {
          const code = String.fromCharCode(a, b)
          const label = display.of(code)
          if (label && label !== code) regionIndex.set(label.toLowerCase(), code)
        }
      }
      regionIndex.set('usa', 'US').set('uk', 'GB').set('uae', 'AE').set('england', 'GB')
    } catch {
      /* Intl.DisplayNames unsupported */
    }
  }
  return regionIndex.get(name.trim().toLowerCase()) ?? null
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}
