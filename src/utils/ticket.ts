import {
  BedDouble,
  BusFront,
  FileText,
  Plane,
  Ticket as TicketIcon,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type {
  ActivityData,
  BusData,
  DocumentExtraction,
  DocumentType,
  FlightData,
  FlightSegment,
  GenericData,
  HotelData,
  RestaurantData,
  Ticket,
  TicketPatch,
  TrainData,
} from '@/types'

// ─── Type metadata ──────────────────────────────────────────────────

export interface TypeMeta {
  label: string
  icon: LucideIcon
  /** Tailwind classes for the small icon tile */
  tone: string
}

export const TYPE_META: Record<DocumentType, TypeMeta> = {
  flight: { label: 'Flight', icon: Plane, tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  hotel: { label: 'Hotel', icon: BedDouble, tone: 'bg-amber-500/12 text-amber-700 dark:text-amber-300' },
  train: { label: 'Train', icon: TrainFront, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  bus: { label: 'Bus', icon: BusFront, tone: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  restaurant: { label: 'Dining', icon: UtensilsCrossed, tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  activity: { label: 'Activity', icon: TicketIcon, tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  generic_travel_document: { label: 'Document', icon: FileText, tone: 'bg-stone-500/10 text-stone-700 dark:text-stone-300' },
  unknown: { label: 'Document', icon: FileText, tone: 'bg-stone-500/10 text-stone-700 dark:text-stone-300' },
}

export type FilterKey = 'all' | 'flight' | 'hotel' | 'train' | 'bus' | 'activity' | 'document'

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'flight', label: 'Flights' },
  { key: 'hotel', label: 'Hotels' },
  { key: 'train', label: 'Trains' },
  { key: 'bus', label: 'Bus' },
  { key: 'activity', label: 'Activities' },
  { key: 'document', label: 'Documents' },
]

export function matchesFilter(type: DocumentType, filter: FilterKey): boolean {
  if (filter === 'all') return true
  if (filter === 'activity') return type === 'activity' || type === 'restaurant'
  if (filter === 'document') return type === 'generic_travel_document' || type === 'unknown'
  return type === filter
}

/** Short summary chips for trip cards, e.g. "Flight • Hotel • Train". */
export function typeSummary(types: DocumentType[]): string[] {
  const order: DocumentType[] = ['flight', 'hotel', 'train', 'bus', 'activity', 'restaurant', 'generic_travel_document']
  const present = new Set<DocumentType>(types.map((t) => (t === 'unknown' ? 'generic_travel_document' : t)))
  return order.filter((t) => present.has(t)).map((t) => TYPE_META[t].label)
}

// ─── Typed accessors ────────────────────────────────────────────────

export function detailsOf<T extends DocumentType>(ticket: Ticket, type: T): DocumentExtraction<T>['details'] | null {
  const data = ticket.structured_data
  if (!data || data.document_type !== type) return null
  return data.details as DocumentExtraction<T>['details']
}

// ─── Flight journey ─────────────────────────────────────────────────

export interface FlightJourney {
  outbound: FlightSegment[]
  inbound: FlightSegment[]
  first: FlightSegment
  last: FlightSegment
  stops: string[]
}

function stamp(date: string | null, time: string | null): number | null {
  if (!date) return null
  const t = new Date(`${date}T${time ?? '12:00'}:00`).getTime()
  return Number.isNaN(t) ? null : t
}

/** Splits an itinerary into outbound / return legs at the longest gap (> 24h). */
export function flightJourney(data: FlightData | null): FlightJourney | null {
  const segs = data?.segments ?? []
  if (segs.length === 0) return null
  let split = segs.length
  let longest = 0
  for (let i = 0; i < segs.length - 1; i++) {
    const a = stamp(segs[i].arrival.date, segs[i].arrival.time)
    const b = stamp(segs[i + 1].departure.date, segs[i + 1].departure.time)
    if (a !== null && b !== null && b - a > longest) {
      longest = b - a
      if (b - a > 24 * 3600_000) split = i + 1
    }
  }
  const outbound = segs.slice(0, split)
  const inbound = segs.slice(split)
  return {
    outbound,
    inbound,
    first: outbound[0],
    last: outbound[outbound.length - 1],
    stops: outbound.slice(0, -1).map((s) => s.arrival.airport_code ?? s.arrival.city ?? '').filter(Boolean),
  }
}

// ─── Columns derived from an extraction ─────────────────────────────

export function deriveTicketColumns(ext: DocumentExtraction): TicketPatch {
  const base: TicketPatch = {
    document_type: ext.document_type,
    confidence: ext.confidence,
    needs_review: ext.confidence < 0.7,
    title: ext.title,
    summary: ext.summary,
    booking_platform: ext.booking_platform.name,
    booking_reference: ext.booking_reference,
    destination: ext.primary_location.city,
    travel_date: ext.start_date,
    end_date: ext.end_date,
  }

  switch (ext.document_type) {
    case 'flight': {
      const d = ext.details as FlightData
      const j = flightJourney(d)
      const lastSeg = d.segments[d.segments.length - 1]
      return {
        ...base,
        provider_name: d.airline.name,
        airline_name: d.airline.name,
        airline_code: d.airline.iata_code,
        booking_reference: d.pnr ?? ext.booking_reference,
        origin: j?.first.departure.city ?? j?.first.departure.airport_code ?? null,
        destination: j?.last.arrival.city ?? j?.last.arrival.airport_code ?? base.destination ?? null,
        travel_date: j?.first.departure.date ?? ext.start_date,
        end_date: lastSeg?.arrival.date ?? ext.end_date,
        start_time: j?.first.departure.time ?? null,
        end_time: j?.last.arrival.time ?? null,
        title: ext.title ?? routeTitle(j?.first.departure.city, j?.last.arrival.city),
      }
    }
    case 'hotel': {
      const d = ext.details as HotelData
      return {
        ...base,
        provider_name: d.hotel.name,
        booking_reference: d.confirmation_number ?? ext.booking_reference,
        destination: d.hotel.city ?? base.destination ?? null,
        travel_date: d.check_in.date ?? ext.start_date,
        end_date: d.check_out.date ?? ext.end_date,
        start_time: d.check_in.time,
        end_time: d.check_out.time,
        title: d.hotel.name ?? ext.title,
      }
    }
    case 'train':
    case 'bus': {
      const d = ext.details as TrainData | BusData
      const from = d.departure.city ?? d.departure.station
      const to = d.arrival.city ?? d.arrival.station
      return {
        ...base,
        provider_name: d.operator.name ?? ('train_name' in d ? d.train_name : null),
        booking_reference: d.pnr ?? ('ticket_number' in d ? d.ticket_number : null) ?? ext.booking_reference,
        origin: from,
        destination: to ?? base.destination ?? null,
        travel_date: d.departure.date ?? ext.start_date,
        end_date: d.arrival.date ?? ext.end_date,
        start_time: d.departure.time,
        end_time: d.arrival.time,
        title: ext.title ?? routeTitle(from, to),
      }
    }
    case 'restaurant': {
      const d = ext.details as RestaurantData
      return {
        ...base,
        provider_name: d.name,
        booking_reference: d.reservation_number ?? ext.booking_reference,
        destination: d.city ?? base.destination ?? null,
        travel_date: d.date ?? ext.start_date,
        start_time: d.time,
        title: d.name ?? ext.title,
      }
    }
    case 'activity': {
      const d = ext.details as ActivityData
      return {
        ...base,
        provider_name: d.venue ?? d.name,
        booking_reference: d.reference ?? ext.booking_reference,
        destination: d.city ?? base.destination ?? null,
        travel_date: d.date ?? ext.start_date,
        start_time: d.time,
        end_time: d.end_time,
        title: d.name ?? ext.title,
      }
    }
    default: {
      const d = ext.details as GenericData
      return {
        ...base,
        provider_name: d.issuer,
        destination: d.city ?? base.destination ?? null,
      }
    }
  }
}

function routeTitle(from: string | null | undefined, to: string | null | undefined): string | null {
  if (from && to) return `${from} → ${to}`
  return from ?? to ?? null
}

// ─── View model (columns win — they hold the user's edits) ──────────

export interface TicketView {
  meta: TypeMeta
  title: string
  subtitle: string | null
  date: string | null
  time: string | null
  endDate: string | null
  endTime: string | null
  reference: string | null
  provider: string | null
}

export function ticketView(ticket: Ticket): TicketView {
  const meta = TYPE_META[ticket.document_type] ?? TYPE_META.unknown
  const route = ticket.origin && ticket.destination ? `${ticket.origin} → ${ticket.destination}` : null
  const title = ticket.title ?? route ?? ticket.provider_name ?? ticket.file_name ?? meta.label
  let subtitle: string | null
  switch (ticket.document_type) {
    case 'flight':
    case 'train':
    case 'bus':
      subtitle = [ticket.provider_name, title === route ? null : route].filter(Boolean).join(' · ') || null
      break
    case 'hotel':
    case 'restaurant':
    case 'activity':
      subtitle = ticket.destination
      break
    default:
      subtitle = ticket.provider_name ?? ticket.summary
  }
  return {
    meta,
    title,
    subtitle,
    date: ticket.travel_date,
    time: ticket.start_time,
    endDate: ticket.end_date,
    endTime: ticket.end_time,
    reference: ticket.booking_reference,
    provider: ticket.provider_name,
  }
}

export function ticketSearchText(ticket: Ticket): string {
  return [
    ticket.title,
    ticket.origin,
    ticket.destination,
    ticket.provider_name,
    ticket.booking_platform,
    ticket.booking_reference,
    ticket.file_name,
    ticket.summary,
    ticket.notes,
    TYPE_META[ticket.document_type]?.label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function chronoKey(ticket: Ticket): string {
  return `${ticket.travel_date ?? '9999-12-31'}T${ticket.start_time ?? '99:99'}|${ticket.created_at}`
}

export function isStale(ticket: Ticket): boolean {
  // A ticket stuck in processing for >3 minutes (tab closed mid-way) can be retried.
  return (
    (ticket.processing_status === 'processing' || ticket.processing_status === 'uploaded') &&
    Date.now() - new Date(ticket.updated_at).getTime() > 3 * 60_000
  )
}
