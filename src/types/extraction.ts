/**
 * AI extraction contract shared by the browser and the /api functions.
 * Keep this file dependency-free — it is type-checked from both sides.
 *
 * Every leaf value is nullable: the extraction engine must return `null`
 * rather than invent data it cannot see in the document.
 */

export const DOCUMENT_TYPES = [
  'flight',
  'hotel',
  'train',
  'bus',
  'restaurant',
  'activity',
  'generic_travel_document',
  'unknown',
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export type Nullable<T> = T | null

export interface ProviderRef {
  name: Nullable<string>
  /** Official website domain, e.g. "makemytrip.com" — used for logo lookup. */
  domain: Nullable<string>
}

export interface PlaceRef {
  city: Nullable<string>
  country: Nullable<string>
  /** ISO 3166-1 alpha-2 */
  country_code: Nullable<string>
}

export interface Money {
  amount: Nullable<number>
  currency: Nullable<string>
}

// ─── Flight ─────────────────────────────────────────────────────────

export interface FlightEndpoint {
  airport: Nullable<string>
  airport_code: Nullable<string>
  city: Nullable<string>
  country: Nullable<string>
  /** YYYY-MM-DD */
  date: Nullable<string>
  /** HH:mm (24h) */
  time: Nullable<string>
  terminal: Nullable<string>
}

export interface FlightSegment {
  flight_number: Nullable<string>
  departure: FlightEndpoint
  arrival: FlightEndpoint
  seat: Nullable<string>
  cabin_class: Nullable<string>
  duration: Nullable<string>
}

export interface FlightData {
  airline: { name: Nullable<string>; iata_code: Nullable<string>; domain: Nullable<string> }
  segments: FlightSegment[]
  pnr: Nullable<string>
  ticket_number: Nullable<string>
  baggage: Nullable<string>
  passengers: string[]
}

// ─── Hotel ──────────────────────────────────────────────────────────

export interface DateTimeRef {
  date: Nullable<string>
  time: Nullable<string>
}

export interface HotelData {
  hotel: {
    name: Nullable<string>
    address: Nullable<string>
    city: Nullable<string>
    country: Nullable<string>
    phone: Nullable<string>
    domain: Nullable<string>
  }
  check_in: DateTimeRef
  check_out: DateTimeRef
  nights: Nullable<number>
  rooms: Nullable<number>
  room_type: Nullable<string>
  guests: Nullable<number>
  confirmation_number: Nullable<string>
}

// ─── Train / Bus ────────────────────────────────────────────────────

export interface TransitEndpoint {
  station: Nullable<string>
  station_code: Nullable<string>
  city: Nullable<string>
  date: Nullable<string>
  time: Nullable<string>
}

export interface TrainData {
  operator: ProviderRef
  train_name: Nullable<string>
  train_number: Nullable<string>
  departure: TransitEndpoint
  arrival: TransitEndpoint
  pnr: Nullable<string>
  coach: Nullable<string>
  seat: Nullable<string>
  berth: Nullable<string>
  travel_class: Nullable<string>
  passengers: string[]
}

export interface BusData {
  operator: ProviderRef
  bus_type: Nullable<string>
  departure: TransitEndpoint
  arrival: TransitEndpoint
  seat: Nullable<string>
  ticket_number: Nullable<string>
  pnr: Nullable<string>
  passengers: string[]
}

// ─── Restaurant / Activity ──────────────────────────────────────────

export interface RestaurantData {
  name: Nullable<string>
  address: Nullable<string>
  city: Nullable<string>
  date: Nullable<string>
  time: Nullable<string>
  party_size: Nullable<number>
  reservation_number: Nullable<string>
  domain: Nullable<string>
}

export interface ActivityData {
  name: Nullable<string>
  venue: Nullable<string>
  address: Nullable<string>
  city: Nullable<string>
  date: Nullable<string>
  time: Nullable<string>
  end_time: Nullable<string>
  ticket_count: Nullable<number>
  reference: Nullable<string>
  domain: Nullable<string>
}

// ─── Generic ────────────────────────────────────────────────────────

export interface GenericData {
  issuer: Nullable<string>
  key_facts: { label: string; value: string }[]
  dates: { label: string; date: string }[]
  city: Nullable<string>
}

export interface DetailsByType {
  flight: FlightData
  hotel: HotelData
  train: TrainData
  bus: BusData
  restaurant: RestaurantData
  activity: ActivityData
  generic_travel_document: GenericData
  unknown: GenericData
}

/** Envelope returned by /api/extract and stored in tickets.structured_data. */
export interface DocumentExtraction<T extends DocumentType = DocumentType> {
  schema_version: 1
  document_type: T
  /** 0..1 — overall extraction confidence */
  confidence: number
  title: Nullable<string>
  summary: Nullable<string>
  booking_platform: ProviderRef
  booking_reference: Nullable<string>
  primary_location: PlaceRef
  start_date: Nullable<string>
  end_date: Nullable<string>
  total_price: Money
  details: DetailsByType[T]
  /** Fields the model returned that were dropped because they don't appear in the source text. */
  ungrounded_fields: string[]
  /** Set when one document was split into several journeys (outbound + return). */
  leg?: 'outbound' | 'return'
}

// ─── API contracts ──────────────────────────────────────────────────

export interface ExtractRequest {
  kind: 'text' | 'images'
  text?: string
  /** data: URLs (image/jpeg|png|webp), max 3 */
  images?: string[]
  file_name: string
  mime_type: string
}

export interface ExtractResponse {
  extraction: DocumentExtraction
  raw_text: string
  models: { text: string; vision: string | null }
}

export interface TripInsightRequest {
  trip_name: string
  current_destination: string | null
  candidates: { city: string; country: string | null; weight: number; reasons: string[] }[]
  tickets: { type: DocumentType; title: string | null; origin: string | null; destination: string | null; date: string | null }[]
}

export interface TripInsightResponse {
  destination: string
  country: string | null
  country_code: string | null
  image_query: string
  confidence: number
}

export interface ResolvedImage {
  url: string | null
  source: string | null
  attribution: string | null
}

export interface ResolvedLogo {
  url: string | null
  source: string | null
  domain: string | null
}
