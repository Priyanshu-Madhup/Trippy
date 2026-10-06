/**
 * Defensive normalisation of model output + hallucination guard.
 *
 * The model is instructed not to invent data, but we don't trust that alone:
 * identifiers (PNRs, flight numbers, seats, references…) and addresses are
 * checked against the source text and dropped when they don't appear in it.
 */
import type {
  ActivityData,
  BusData,
  DetailsByType,
  DocumentExtraction,
  DocumentType,
  FlightData,
  FlightEndpoint,
  GenericData,
  HotelData,
  RestaurantData,
  TrainData,
  TransitEndpoint,
} from '../../src/types/extraction.js'

type Raw = Record<string, unknown>

const EMPTY = new Set(['', 'null', 'none', 'n/a', 'na', 'not provided', 'not available', 'unknown', '-', '--', '—'])

function rec(v: unknown): Raw {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {}
}

export function s(v: unknown, max = 300): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim()
  if (EMPTY.has(t.toLowerCase())) return null
  return t.slice(0, max)
}

function n(v: unknown): number | null {
  const x = typeof v === 'string' ? Number(v.replace(/[^\d.-]/g, '')) : v
  return typeof x === 'number' && Number.isFinite(x) ? x : null
}

function int(v: unknown): number | null {
  const x = n(v)
  return x === null ? null : Math.round(x)
}

function strArr(v: unknown, max = 12): string[] {
  return Array.isArray(v) ? v.map((x) => s(x, 120)).filter((x): x is string => !!x).slice(0, max) : []
}

export function normDate(v: unknown): string | null {
  const t = s(v)
  if (!t) return null
  const m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (!m) return null
  const [, y, mo, d] = m
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  const parsed = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) return null
  const year = Number(y)
  return year >= 2000 && year <= 2100 ? iso : null
}

export function normTime(v: unknown): string | null {
  const t = s(v)
  if (!t) return null
  const m = t.match(/(\d{1,2})[:.h](\d{2})\s*([ap]\.?m\.?)?/i) ?? t.match(/^(\d{2})(\d{2})$/)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2])
  const ampm = m[3]?.toLowerCase().replace(/\./g, '')
  if (ampm === 'pm' && h < 12) h += 12
  if (ampm === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function code(v: unknown, len: number): string | null {
  const t = s(v)
  if (!t) return null
  const c = t.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return c.length === len ? c : null
}

function domain(v: unknown): string | null {
  const t = s(v)
  if (!t) return null
  const d = t
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#\s]/)[0]
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : null
}

function countryCode(v: unknown): string | null {
  const c = code(v, 2)
  return c && /^[A-Z]{2}$/.test(c) ? c : null
}

// ─── Grounding ──────────────────────────────────────────────────────

const alnum = (x: string) => x.toUpperCase().replace(/[^A-Z0-9]/g, '')

class Grounder {
  private hay: string
  private words: Set<string>
  private source: string
  readonly dropped: string[] = []

  constructor(source: string) {
    this.source = source
    this.hay = alnum(source)
    this.words = new Set(source.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3))
  }

  /** Keep an identifier only if it literally appears in the source text. */
  id(value: string | null, field: string): string | null {
    if (!value) return null
    const needle = alnum(value)
    if (needle.length === 0) return null
    if (this.hay.includes(needle)) return value
    this.dropped.push(field)
    return null
  }

  /**
   * Deterministic fallback for explicitly labelled identifiers the model missed,
   * e.g. "PNR: DYQBNK". Only ever returns text that is printed in the document.
   */
  labelled(label: string): string | null {
    const pattern = new RegExp(String.raw`\b${label}\b\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9]{5,12})\b`, 'i')
    const value = this.source.match(pattern)?.[1]
    // Must look like a code (has a digit, or is a 6-letter record locator) — not a plain word.
    return value && /\d|^[A-Z]{6}$/.test(value) ? value.toUpperCase() : null
  }

  /** Keep free text (addresses) only if most of its words appear in the source. */
  text(value: string | null, field: string): string | null {
    if (!value) return null
    const tokens = value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3)
    if (tokens.length === 0) return value
    const hits = tokens.filter((w) => this.words.has(w)).length
    if (hits / tokens.length >= 0.6) return value
    this.dropped.push(field)
    return null
  }
}

// ─── Per-type sanitisers ────────────────────────────────────────────

function flightEndpoint(v: unknown): FlightEndpoint {
  const r = rec(v)
  return {
    airport: s(r.airport),
    airport_code: code(r.airport_code, 3),
    city: s(r.city, 80),
    country: s(r.country, 80),
    date: normDate(r.date),
    time: normTime(r.time),
    terminal: s(r.terminal, 20),
  }
}

function transitEndpoint(v: unknown): TransitEndpoint {
  const r = rec(v)
  return {
    station: s(r.station, 160),
    station_code: s(r.station_code, 12)?.toUpperCase() ?? null,
    city: s(r.city, 80),
    date: normDate(r.date),
    time: normTime(r.time),
  }
}

function provider(v: unknown) {
  const r = rec(v)
  return { name: s(r.name, 120), domain: domain(r.domain) }
}

function flight(r: Raw, g: Grounder): FlightData {
  const airline = rec(r.airline)
  const segments = (Array.isArray(r.segments) ? r.segments : []).slice(0, 8).map((seg, i) => {
    const x = rec(seg)
    return {
      flight_number: g.id(s(x.flight_number, 12)?.toUpperCase().replace(/\s+/g, '') ?? null, `segments[${i}].flight_number`),
      departure: flightEndpoint(x.departure),
      arrival: flightEndpoint(x.arrival),
      seat: g.id(s(x.seat, 8)?.toUpperCase() ?? null, `segments[${i}].seat`),
      cabin_class: s(x.cabin_class, 40),
      duration: s(x.duration, 20),
    }
  })
  return {
    airline: { name: s(airline.name, 120), iata_code: code(airline.iata_code, 2), domain: domain(airline.domain) },
    segments,
    pnr: g.id(s(r.pnr, 20)?.toUpperCase() ?? null, 'pnr') ?? g.labelled('PNR'),
    ticket_number: g.id(s(r.ticket_number, 30), 'ticket_number'),
    baggage: s(r.baggage, 120),
    passengers: strArr(r.passengers),
  }
}

function hotel(r: Raw, g: Grounder): HotelData {
  const h = rec(r.hotel)
  const ci = rec(r.check_in)
  const co = rec(r.check_out)
  return {
    hotel: {
      name: s(h.name, 160),
      address: g.text(s(h.address, 300), 'hotel.address'),
      city: s(h.city, 80),
      country: s(h.country, 80),
      phone: g.id(s(h.phone, 40), 'hotel.phone'),
      domain: domain(h.domain),
    },
    check_in: { date: normDate(ci.date), time: normTime(ci.time) },
    check_out: { date: normDate(co.date), time: normTime(co.time) },
    nights: int(r.nights),
    rooms: int(r.rooms),
    room_type: s(r.room_type, 120),
    guests: int(r.guests),
    confirmation_number: g.id(s(r.confirmation_number, 40), 'confirmation_number'),
  }
}

function train(r: Raw, g: Grounder): TrainData {
  return {
    operator: provider(r.operator),
    train_name: s(r.train_name, 120),
    train_number: g.id(s(r.train_number, 20), 'train_number'),
    departure: transitEndpoint(r.departure),
    arrival: transitEndpoint(r.arrival),
    pnr: g.id(s(r.pnr, 20), 'pnr') ?? g.labelled('PNR'),
    coach: g.id(s(r.coach, 12), 'coach'),
    seat: g.id(s(r.seat, 12), 'seat'),
    berth: s(r.berth, 30),
    travel_class: s(r.travel_class, 40),
    passengers: strArr(r.passengers),
  }
}

function bus(r: Raw, g: Grounder): BusData {
  return {
    operator: provider(r.operator),
    bus_type: s(r.bus_type, 80),
    departure: transitEndpoint(r.departure),
    arrival: transitEndpoint(r.arrival),
    seat: g.id(s(r.seat, 20), 'seat'),
    ticket_number: g.id(s(r.ticket_number, 40), 'ticket_number'),
    pnr: g.id(s(r.pnr, 40), 'pnr'),
    passengers: strArr(r.passengers),
  }
}

function restaurant(r: Raw, g: Grounder): RestaurantData {
  return {
    name: s(r.name, 160),
    address: g.text(s(r.address, 300), 'address'),
    city: s(r.city, 80),
    date: normDate(r.date),
    time: normTime(r.time),
    party_size: int(r.party_size),
    reservation_number: g.id(s(r.reservation_number, 40), 'reservation_number'),
    domain: domain(r.domain),
  }
}

function activity(r: Raw, g: Grounder): ActivityData {
  return {
    name: s(r.name, 160),
    venue: s(r.venue, 160),
    address: g.text(s(r.address, 300), 'address'),
    city: s(r.city, 80),
    date: normDate(r.date),
    time: normTime(r.time),
    end_time: normTime(r.end_time),
    ticket_count: int(r.ticket_count),
    reference: g.id(s(r.reference, 40), 'reference'),
    domain: domain(r.domain),
  }
}

function generic(r: Raw): GenericData {
  const facts = (Array.isArray(r.key_facts) ? r.key_facts : [])
    .map((f) => ({ label: s(rec(f).label, 60), value: s(rec(f).value, 200) }))
    .filter((f): f is { label: string; value: string } => !!f.label && !!f.value)
    .slice(0, 8)
  const dates = (Array.isArray(r.dates) ? r.dates : [])
    .map((f) => ({ label: s(rec(f).label, 60), date: normDate(rec(f).date) }))
    .filter((f): f is { label: string; date: string } => !!f.label && !!f.date)
    .slice(0, 6)
  return { issuer: s(r.issuer, 120), key_facts: facts, dates, city: s(r.city, 80) }
}

function details(type: DocumentType, raw: Raw, g: Grounder): DetailsByType[DocumentType] {
  switch (type) {
    case 'flight':
      return flight(raw, g)
    case 'hotel':
      return hotel(raw, g)
    case 'train':
      return train(raw, g)
    case 'bus':
      return bus(raw, g)
    case 'restaurant':
      return restaurant(raw, g)
    case 'activity':
      return activity(raw, g)
    default:
      return generic(raw)
  }
}

export function buildExtraction(
  type: DocumentType,
  raw: Raw,
  sourceText: string,
  classifyConfidence: number,
): DocumentExtraction {
  const g = new Grounder(sourceText)
  const platform = rec(raw.booking_platform)
  const loc = rec(raw.primary_location)
  const price = rec(raw.total_price)

  const det = details(type, rec(raw.details), g)
  const bookingReference = g.id(s(raw.booking_reference, 40), 'booking_reference')

  const modelConfidence = clamp01(n(raw.confidence) ?? 0.5)
  // Penalise when the model produced identifiers that weren't in the source.
  const groundingPenalty = Math.min(0.3, g.dropped.length * 0.08)
  const confidence = clamp01(Math.min(modelConfidence, classifyConfidence) - groundingPenalty)

  return {
    schema_version: 1,
    document_type: type,
    confidence: Math.round(confidence * 1000) / 1000,
    title: s(raw.title, 140),
    summary: s(raw.summary, 400),
    booking_platform: { name: s(platform.name, 80), domain: domain(platform.domain) },
    booking_reference: bookingReference,
    primary_location: { city: s(loc.city, 80), country: s(loc.country, 80), country_code: countryCode(loc.country_code) },
    start_date: normDate(raw.start_date),
    end_date: normDate(raw.end_date),
    total_price: { amount: n(price.amount), currency: s(price.currency, 3)?.toUpperCase() ?? null },
    details: det,
    ungrounded_fields: g.dropped,
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

export { domain as normalizeDomain, countryCode as normalizeCountryCode, clamp01 }
