/**
 * Upload → AI understands → beautiful card appears.
 *
 * processTicket()         runs extraction for one stored ticket and saves the result
 * resolveTicketVisuals()  logos (airline, booking platform, operator) and imagery
 * updateTripFromTicket()  re-derives the trip's destination, dates, cover and places
 */
import type { DocumentExtraction, FlightData, HotelData, ActivityData, BusData, Ticket, TicketPatch, Trip, TripPatch, TrainData } from '@/types'
import type { TripInsightRequest, TripInsightResponse } from '@/types/extraction'
import { countryCodeFromName } from '@/lib/utils'
import { deriveTicketColumns } from '@/utils/ticket'
import { extractDocument } from './ai'
import { ApiError, apiFetch } from './api'
import { backend, type PlaceInput } from './backend'
import { resolveHotelImage, resolvePlaceImage, resolveProviderLogo } from './resolvers'
import { refreshTripCover } from './trips'

export type ProcessingStage = 'reading' | 'identifying' | 'extracting' | 'building' | 'finishing'

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'unreadable') return "Couldn't read this document."
    if (err.code === 'ai_not_configured') return 'AI extraction isn’t configured yet (missing GROQ_API_KEY).'
    if (err.code === 'payload_too_large') return 'This document is too large to analyse.'
    if (err.status === 401) return 'Your session expired — sign in again and retry.'
    if (err.status === 0) return 'You appear to be offline. Retry when you’re connected.'
    return err.message || "Couldn't read this document."
  }
  return err instanceof Error && err.message ? err.message : "Couldn't read this document."
}

// ─── Visuals ────────────────────────────────────────────────────────

export async function resolveTicketVisuals(ext: DocumentExtraction): Promise<TicketPatch> {
  const patch: TicketPatch = {}
  const jobs: Promise<void>[] = []

  if (ext.booking_platform.name && ext.booking_platform.domain) {
    jobs.push(
      resolveProviderLogo({ kind: 'platform', name: ext.booking_platform.name, domain: ext.booking_platform.domain }).then((url) => {
        patch.booking_platform_logo_url = url
      }),
    )
  }

  switch (ext.document_type) {
    case 'flight': {
      const d = ext.details as FlightData
      jobs.push(
        resolveProviderLogo({ kind: 'airline', name: d.airline.name, domain: d.airline.domain, iata: d.airline.iata_code }).then((url) => {
          patch.airline_logo_url = url
        }),
      )
      break
    }
    case 'hotel': {
      const d = ext.details as HotelData
      if (d.hotel.name) {
        jobs.push(
          resolveHotelImage(d.hotel.name, d.hotel.city ?? ext.primary_location.city).then((img) => {
            patch.image_url = img.url
          }),
        )
      }
      if (d.hotel.domain) {
        jobs.push(
          resolveProviderLogo({ kind: 'provider', name: d.hotel.name, domain: d.hotel.domain }).then((url) => {
            patch.provider_logo_url = url
          }),
        )
      }
      break
    }
    case 'train':
    case 'bus': {
      const d = ext.details as TrainData | BusData
      if (d.operator.domain) {
        jobs.push(
          resolveProviderLogo({ kind: 'provider', name: d.operator.name, domain: d.operator.domain }).then((url) => {
            patch.provider_logo_url = url
          }),
        )
      }
      break
    }
    case 'activity': {
      const d = ext.details as ActivityData
      const name = d.venue ?? d.name
      if (name) {
        jobs.push(
          resolvePlaceImage(name, d.city ?? ext.primary_location.city).then((img) => {
            patch.image_url = img.url
          }),
        )
      }
      break
    }
    default:
      break
  }

  await Promise.allSettled(jobs)
  return patch
}

// ─── Processing ─────────────────────────────────────────────────────

export async function processTicket(
  ticket: Ticket,
  options: { file?: Blob; onStage?: (stage: ProcessingStage) => void } = {},
): Promise<Ticket> {
  const stage = options.onStage ?? (() => undefined)
  try {
    if (ticket.processing_status !== 'processing') {
      await backend.updateTicket(ticket.id, { processing_status: 'processing', error_message: null })
    }
    stage('reading')
    const blob = options.file ?? (ticket.file_path ? await backend.downloadFile(ticket.file_path) : null)
    if (!blob) throw new Error('The original file is missing.')

    // The server does OCR + classification + extraction in one call; advance
    // the visible stages while it works so progress feels alive.
    const timers = [setTimeout(() => stage('identifying'), 1500), setTimeout(() => stage('extracting'), 4200)]
    let result
    try {
      result = await extractDocument(blob, ticket.file_name ?? 'document', ticket.mime_type ?? blob.type)
    } finally {
      timers.forEach(clearTimeout)
    }

    stage('building')
    const extraction = result.extraction
    const columns = deriveTicketColumns(extraction)
    const visuals = await resolveTicketVisuals(extraction)

    const updated = await backend.updateTicket(ticket.id, {
      ...columns,
      ...visuals,
      structured_data: extraction,
      raw_text: result.raw_text.slice(0, 20_000),
      processing_status: 'completed',
      error_message: null,
    })

    stage('finishing')
    await updateTripFromTicket(ticket.trip_id).catch((err) => console.warn('[trip] update failed', err))
    return updated
  } catch (err) {
    const message = friendlyError(err)
    await backend.updateTicket(ticket.id, { processing_status: 'failed', error_message: message }).catch(() => undefined)
    throw new Error(message)
  }
}

// ─── Trip intelligence ──────────────────────────────────────────────

interface Candidate {
  city: string
  country: string | null
  countryCode: string | null
  weight: number
  reasons: string[]
}

const TRANSPORT = new Set(['flight', 'train', 'bus'])
const norm = (s: string) => s.trim().toLowerCase()

/** Weighted destination candidates — hotels count most, home city is excluded. */
export function destinationCandidates(tickets: Ticket[]): Candidate[] {
  const transport = tickets
    .filter((t) => TRANSPORT.has(t.document_type) && t.origin)
    .sort((a, b) => (a.travel_date ?? '9999').localeCompare(b.travel_date ?? '9999'))
  const home = transport[0]?.origin ? norm(transport[0].origin) : null

  const map = new Map<string, Candidate>()
  const add = (city: string | null, weight: number, reason: string, loc?: DocumentExtraction['primary_location']) => {
    if (!city || (home && norm(city) === home)) return
    const key = norm(city)
    const existing = map.get(key) ?? { city, country: null, countryCode: null, weight: 0, reasons: [] }
    existing.weight += weight
    existing.reasons.push(reason)
    if (loc?.city && norm(loc.city) === key) {
      existing.country ??= loc.country
      existing.countryCode ??= loc.country_code
    }
    map.set(key, existing)
  }

  for (const t of tickets) {
    const loc = t.structured_data?.primary_location
    switch (t.document_type) {
      case 'hotel': {
        const nights = (t.structured_data?.details as HotelData | undefined)?.nights ?? 1
        add(t.destination, 3 + Math.min(nights, 10), `hotel: ${t.provider_name ?? t.title ?? ''}`, loc)
        break
      }
      case 'activity':
      case 'restaurant':
        add(t.destination, 2, `${t.document_type}: ${t.title ?? ''}`, loc)
        break
      case 'flight':
      case 'train':
      case 'bus':
        add(t.destination, 2, `${t.document_type} to ${t.destination}`, loc)
        break
      default:
        add(t.destination, 0.5, 'document', loc)
    }
  }
  return [...map.values()].sort((a, b) => b.weight - a.weight)
}

async function decideDestination(
  trip: Trip,
  tickets: Ticket[],
): Promise<{ destination: string; country: string | null; country_code: string | null; image_query: string } | null> {
  const candidates = destinationCandidates(tickets)
  if (candidates.length === 0) return null
  const [top, second] = candidates
  const clear = !second || top.weight >= second.weight * 2

  const fallback = {
    destination: top.city,
    country: top.country,
    country_code: top.countryCode ?? countryCodeFromName(top.country),
    image_query: `${top.city} skyline`,
  }
  if (clear) return fallback

  // Ambiguous (e.g. several cities with similar weight) → ask GPT-OSS-20B.
  try {
    const body: TripInsightRequest = {
      trip_name: trip.name,
      current_destination: trip.destination,
      candidates: candidates.map((c) => ({ city: c.city, country: c.country, weight: c.weight, reasons: c.reasons })),
      tickets: tickets.map((t) => ({
        type: t.document_type,
        title: t.title,
        origin: t.origin,
        destination: t.destination,
        date: t.travel_date,
      })),
    }
    const res = await apiFetch<TripInsightResponse>('/api/trip-insight', { method: 'POST', body: JSON.stringify(body) })
    return {
      destination: res.destination,
      country: res.country,
      country_code: res.country_code ?? countryCodeFromName(res.country),
      image_query: res.image_query,
    }
  } catch {
    return fallback
  }
}

function placesFrom(tickets: Ticket[]): PlaceInput[] {
  const places: PlaceInput[] = []
  for (const t of tickets) {
    if (t.destination) places.push({ place_name: t.destination, place_type: 'city', ticket_id: t.id })
    if (t.document_type === 'hotel' && t.provider_name) {
      places.push({ place_name: t.provider_name, place_type: 'hotel', ticket_id: t.id, image_url: t.image_url, source: 'ai' })
    }
    if (t.document_type === 'activity' && t.provider_name) {
      places.push({ place_name: t.provider_name, place_type: 'venue', ticket_id: t.id, image_url: t.image_url, source: 'ai' })
    }
    if (t.document_type === 'flight') {
      for (const seg of (t.structured_data?.details as FlightData | undefined)?.segments ?? []) {
        if (seg.arrival.airport_code) places.push({ place_name: seg.arrival.airport_code, place_type: 'airport', ticket_id: t.id })
      }
    }
  }
  return places
}

/**
 * Re-derives trip metadata after a ticket changes:
 * destination (unless the user set it), dates, cover image and places.
 */
export async function updateTripFromTicket(tripId: string): Promise<Trip | null> {
  const [trip, all] = await Promise.all([backend.getTrip(tripId), backend.listTickets(tripId)])
  if (!trip) return null
  const tickets = all.filter((t) => t.processing_status === 'completed')
  const patch: TripPatch = {}

  // Dates: fill or widen to cover every dated booking (documents like visas don't count).
  const dated = tickets.filter((t) => t.document_type !== 'generic_travel_document' && t.document_type !== 'unknown')
  const starts = dated.map((t) => t.travel_date).filter((d): d is string => !!d).sort()
  const ends = dated.map((t) => t.end_date ?? t.travel_date).filter((d): d is string => !!d).sort()
  if (starts.length && (!trip.start_date || starts[0] < trip.start_date)) patch.start_date = starts[0]
  const lastEnd = ends.at(-1)
  if (lastEnd && (!trip.end_date || lastEnd > trip.end_date)) patch.end_date = lastEnd
  const start = patch.start_date ?? trip.start_date
  const end = patch.end_date ?? trip.end_date
  if (start && end && end < start) patch.end_date = start

  // Destination (AI-owned only).
  let coverQuery: string | null = null
  if (trip.destination_source !== 'user') {
    const decision = await decideDestination(trip, tickets)
    if (decision && norm(decision.destination) !== norm(trip.destination ?? '')) {
      patch.destination = decision.destination
      patch.country = decision.country
      patch.country_code = decision.country_code
      coverQuery = decision.image_query
    }
  }

  let updated = Object.keys(patch).length ? await backend.updateTrip(trip.id, patch) : trip

  // Cover image follows the destination.
  if (coverQuery || !updated.cover_image_url) {
    updated = await refreshTripCover(updated, coverQuery ?? (updated.destination ? `${updated.destination} skyline` : null)).catch(
      () => updated,
    )
  }

  await backend.addPlaces(trip.id, placesFrom(tickets)).catch(() => undefined)
  return updated
}

/**
 * Fills in logos / imagery / covers for rows that don't have them yet —
 * used for sample data, which goes through the same resolvers as real uploads.
 */
export async function enrichMissingVisuals(): Promise<void> {
  const trips = await backend.listTrips()
  for (const trip of trips) {
    const tickets = await backend.listTickets(trip.id)
    await Promise.allSettled(
      tickets
        .filter((t) => t.structured_data && !t.airline_logo_url && !t.booking_platform_logo_url && !t.image_url && !t.provider_logo_url)
        .map(async (t) => {
          const visuals = await resolveTicketVisuals(t.structured_data as DocumentExtraction)
          const filled = Object.fromEntries(Object.entries(visuals).filter(([, v]) => v)) as TicketPatch
          if (Object.keys(filled).length) await backend.updateTicket(t.id, filled)
        }),
    )
    if (!trip.cover_image_url) await refreshTripCover(trip).catch(() => undefined)
  }
}
