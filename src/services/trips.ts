import type { CreateTripInput, Trip, TripPatch, TripWithStats } from '@/types'
import { countryCodeFromName } from '@/lib/utils'
import { backend } from './backend'
import { resolveDestinationImage } from './resolvers'

export function getTrips(): Promise<TripWithStats[]> {
  return backend.listTrips()
}

export function getTrip(id: string): Promise<Trip | null> {
  return backend.getTrip(id)
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const destination = input.destination?.trim() || null
  const countryCode = countryCodeFromName(destination)
  return backend.createTrip({
    name: input.name.trim(),
    destination,
    // A destination typed by the user is never overridden by AI inference.
    destination_source: destination ? 'user' : 'ai',
    country: countryCode ? destination : null,
    country_code: countryCode,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
  })
}

export function updateTrip(id: string, patch: TripPatch): Promise<Trip> {
  return backend.updateTrip(id, patch)
}

export function deleteTrip(id: string): Promise<void> {
  return backend.deleteTrip(id)
}

/**
 * Finds and caches a cover photo for the trip's destination. Stored on the
 * trip row so it's only ever resolved once per destination.
 */
export async function refreshTripCover(trip: Trip, query?: string | null): Promise<Trip> {
  const q = query?.trim() || trip.cover_image_query || trip.destination
  if (!q) return trip
  if (trip.cover_image_url && trip.cover_image_query === q) return trip
  const image = await resolveDestinationImage(q)
  if (!image.url) return trip
  return backend.updateTrip(trip.id, {
    cover_image_url: image.url,
    cover_image_source: image.source,
    cover_image_attribution: image.attribution,
    cover_image_query: q,
  })
}
