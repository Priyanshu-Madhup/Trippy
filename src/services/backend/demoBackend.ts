/**
 * Demo backend — used only when Supabase isn't configured. Data lives in this
 * browser (localStorage + IndexedDB for files). Never used in production.
 */
import { blobStore } from '@/lib/idb'
import { uuid } from '@/lib/utils'
import { buildSampleData, makeTicketRow } from '@/demo/sampleData'
import type { Profile, Ticket, TicketWithTrip, Trip, TripPlace, TripWithStats } from '@/types'
import type { AuthSession, Backend } from './types'

interface DemoDb {
  profile: Profile | null
  trips: Trip[]
  tickets: Ticket[]
  places: TripPlace[]
  seeded: boolean
}

const DB_KEY = 'trippy.demo.db.v1'
const SESSION_KEY = 'trippy.demo.session'
const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as DemoDb
  } catch {
    /* corrupted / unavailable */
  }
  return { profile: null, trips: [], tickets: [], places: [], seeded: false }
}

function save(db: DemoDb) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* quota exceeded — keep in memory */
  }
}

function mutate<T>(fn: (db: DemoDb) => T): T {
  const db = load()
  const result = fn(db)
  save(db)
  emit()
  return result
}

const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((l) => l())
}

const authListeners = new Set<(s: AuthSession | null) => void>()
function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}
function writeSession(session: AuthSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  authListeners.forEach((l) => l(session))
}

const now = () => new Date().toISOString()
const latency = () => new Promise((r) => setTimeout(r, 120))
const objectUrls = new Map<string, string>()

function startSession(name: string | null, email: string): AuthSession {
  const session: AuthSession = { user: { id: DEMO_USER_ID, email, name } }
  mutate((db) => {
    db.profile ??= { id: DEMO_USER_ID, email, name, avatar_url: null, preferences: { notifications: true }, created_at: now() }
    if (name) db.profile.name = name
    db.profile.email = email
    if (!db.seeded) {
      seedInto(db)
      db.seeded = true
    }
  })
  writeSession(session)
  return session
}

function seedInto(db: DemoDb): Trip[] {
  const sample = buildSampleData(DEMO_USER_ID)
  const stamp = now()
  const trips = sample.trips.map((t) => ({ ...t, user_id: DEMO_USER_ID, created_at: stamp, updated_at: stamp }))
  db.trips.push(...trips)
  db.tickets.push(...sample.tickets.map((t) => ({ ...t, user_id: DEMO_USER_ID, created_at: stamp, updated_at: stamp })))
  return trips
}

function byTripDate(a: Ticket, b: Ticket) {
  const ka = `${a.travel_date ?? '9999'}${a.start_time ?? '99'}${a.created_at}`
  const kb = `${b.travel_date ?? '9999'}${b.start_time ?? '99'}${b.created_at}`
  return ka.localeCompare(kb)
}

export const demoBackend: Backend = {
  kind: 'demo',

  async getSession() {
    return readSession()
  },
  onAuthChange(cb) {
    authListeners.add(cb)
    return () => authListeners.delete(cb)
  },
  async signIn(email) {
    await latency()
    return startSession(load().profile?.name ?? null, email)
  },
  async signUp(name, email) {
    await latency()
    return { session: startSession(name, email), needsConfirmation: false }
  },
  async signOut() {
    writeSession(null)
  },
  async getAccessToken() {
    return null
  },

  async getProfile() {
    const db = load()
    const session = readSession()
    return (
      db.profile ?? {
        id: DEMO_USER_ID,
        email: session?.user.email ?? null,
        name: session?.user.name ?? null,
        avatar_url: null,
        preferences: { notifications: true },
        created_at: now(),
      }
    )
  },
  async updateProfile(patch) {
    return mutate((db) => {
      db.profile = { ...(db.profile as Profile), ...patch }
      return db.profile
    })
  },
  async getStats() {
    const db = load()
    return {
      trips: db.trips.length,
      tickets: db.tickets.length,
      documents: db.tickets.filter((t) => t.file_path).length,
      storageBytes: db.tickets.reduce((s, t) => s + (t.file_size ?? 0), 0),
    }
  },

  async listTrips() {
    await latency()
    const db = load()
    return db.trips
      .map<TripWithStats>((trip) => ({
        ...trip,
        tickets: db.tickets
          .filter((t) => t.trip_id === trip.id)
          .map((t) => ({ id: t.id, document_type: t.document_type, processing_status: t.processing_status })),
      }))
      .sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'))
  },
  async getTrip(id) {
    await latency()
    return load().trips.find((t) => t.id === id) ?? null
  },
  async createTrip(input) {
    return mutate((db) => {
      const trip: Trip = {
        id: uuid(),
        user_id: DEMO_USER_ID,
        name: input.name,
        destination: input.destination ?? null,
        country: input.country ?? null,
        country_code: input.country_code ?? null,
        destination_source: input.destination_source ?? (input.destination ? 'user' : 'ai'),
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        cover_image_url: null,
        cover_image_source: null,
        cover_image_attribution: null,
        cover_image_query: null,
        is_demo: false,
        created_at: now(),
        updated_at: now(),
      }
      db.trips.push(trip)
      return trip
    })
  },
  async updateTrip(id, patch) {
    return mutate((db) => {
      const i = db.trips.findIndex((t) => t.id === id)
      if (i < 0) throw new Error('Trip not found.')
      db.trips[i] = { ...db.trips[i], ...patch, updated_at: now() }
      return db.trips[i]
    })
  },
  async deleteTrip(id) {
    const paths = load()
      .tickets.filter((t) => t.trip_id === id && t.file_path)
      .map((t) => t.file_path as string)
    mutate((db) => {
      db.trips = db.trips.filter((t) => t.id !== id)
      db.tickets = db.tickets.filter((t) => t.trip_id !== id)
      db.places = db.places.filter((p) => p.trip_id !== id)
    })
    await Promise.all(paths.map((p) => blobStore.delete(p).catch(() => undefined)))
  },

  async listTickets(tripId) {
    await latency()
    return load()
      .tickets.filter((t) => t.trip_id === tripId)
      .sort(byTripDate)
  },
  async listRecentTickets(limit) {
    const db = load()
    return [...db.tickets]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
      .map<TicketWithTrip>((t) => {
        const trip = db.trips.find((x) => x.id === t.trip_id)
        return { ...t, trip: trip ? { id: trip.id, name: trip.name, destination: trip.destination } : null }
      })
  },
  async getTicket(id) {
    return load().tickets.find((t) => t.id === id) ?? null
  },
  async createTicket(row) {
    return mutate((db) => {
      const ticket: Ticket = {
        ...makeTicketRow(row.trip_id, { document_type: 'unknown', processing_status: 'uploaded', confidence: null, is_demo: false }),
        ...row,
        user_id: DEMO_USER_ID,
        created_at: now(),
        updated_at: now(),
      }
      db.tickets.push(ticket)
      return ticket
    })
  },
  async updateTicket(id, patch) {
    return mutate((db) => {
      const i = db.tickets.findIndex((t) => t.id === id)
      if (i < 0) throw new Error('Ticket not found.')
      db.tickets[i] = { ...db.tickets[i], ...patch, updated_at: now() }
      return db.tickets[i]
    })
  },
  async deleteTicket(id) {
    const path = load().tickets.find((t) => t.id === id)?.file_path
    mutate((db) => {
      db.tickets = db.tickets.filter((t) => t.id !== id)
      db.places = db.places.filter((p) => p.ticket_id !== id)
    })
    if (path) await blobStore.delete(path).catch(() => undefined)
  },

  async listPlaces(tripId) {
    return load().places.filter((p) => p.trip_id === tripId)
  },
  async addPlaces(tripId, places) {
    mutate((db) => {
      for (const p of places) {
        const exists = db.places.some(
          (x) => x.trip_id === tripId && x.place_type === p.place_type && x.place_name.toLowerCase() === p.place_name.toLowerCase(),
        )
        if (!exists) {
          db.places.push({
            id: uuid(),
            trip_id: tripId,
            ticket_id: p.ticket_id ?? null,
            place_name: p.place_name,
            place_type: p.place_type,
            image_url: p.image_url ?? null,
            source: p.source ?? null,
            created_at: now(),
          })
        }
      }
    })
  },

  async uploadFile(path, file, onProgress) {
    // Simulate a short, smooth upload so the progress UI behaves like production.
    for (let i = 1; i <= 8; i++) {
      await new Promise((r) => setTimeout(r, 70))
      onProgress?.(i / 8)
    }
    await blobStore.put(path, file)
  },
  async getFileUrl(path) {
    const existing = objectUrls.get(path)
    if (existing) return existing
    const blob = await blobStore.get(path)
    if (!blob) throw new Error('This file is no longer available in this browser.')
    const url = URL.createObjectURL(blob)
    objectUrls.set(path, url)
    return url
  },
  async downloadFile(path) {
    const blob = await blobStore.get(path)
    if (!blob) throw new Error('This file is no longer available in this browser.')
    return blob
  },
  async removeFiles(paths) {
    await Promise.all(paths.map((p) => blobStore.delete(p).catch(() => undefined)))
  },

  subscribeToTrip(_tripId, onChange) {
    listeners.add(onChange)
    return () => listeners.delete(onChange)
  },

  async seedSampleData() {
    return mutate((db) => seedInto(db))
  },
  async removeSampleData() {
    mutate((db) => {
      const ids = new Set(db.trips.filter((t) => t.is_demo).map((t) => t.id))
      db.trips = db.trips.filter((t) => !t.is_demo)
      db.tickets = db.tickets.filter((t) => !ids.has(t.trip_id))
      db.places = db.places.filter((p) => !ids.has(p.trip_id))
    })
  },
}
