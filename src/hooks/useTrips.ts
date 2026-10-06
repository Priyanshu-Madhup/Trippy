import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { backend } from '@/services/backend'
import { createTrip, deleteTrip, getTrip, getTrips, refreshTripCover, updateTrip } from '@/services/trips'
import { countryCodeFromName } from '@/lib/utils'
import type { CreateTripInput, Trip, TripPatch } from '@/types'

export function useTrips() {
  return useQuery({ queryKey: qk.trips, queryFn: getTrips })
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: qk.trip(id ?? ''),
    queryFn: () => getTrip(id as string),
    enabled: !!id,
  })
}

export function usePlaces(tripId: string | undefined) {
  return useQuery({
    queryKey: qk.places(tripId ?? ''),
    queryFn: () => backend.listPlaces(tripId as string),
    enabled: !!tripId,
  })
}

function useInvalidateTrip() {
  const qc = useQueryClient()
  return (trip: Trip) => {
    qc.setQueryData(qk.trip(trip.id), trip)
    void qc.invalidateQueries({ queryKey: qk.trips })
  }
}

export function useCreateTrip() {
  const qc = useQueryClient()
  const sync = useInvalidateTrip()
  return useMutation({
    mutationFn: (input: CreateTripInput) => createTrip(input),
    onSuccess: (trip) => {
      sync(trip)
      void qc.invalidateQueries({ queryKey: qk.stats })
      // Resolve a cover photo in the background — the hero shows a gradient meanwhile.
      if (trip.destination) void refreshTripCover(trip, `${trip.destination} skyline`).then(sync).catch(() => undefined)
    },
  })
}

export function useUpdateTrip() {
  const sync = useInvalidateTrip()
  return useMutation({
    mutationFn: async ({ trip, patch }: { trip: Trip; patch: TripPatch }) => {
      const destinationChanged = 'destination' in patch && (patch.destination ?? null) !== trip.destination
      const finalPatch: TripPatch = { ...patch }
      if (destinationChanged) {
        const code = countryCodeFromName(patch.destination)
        // The user typed it — AI inference must not override it later.
        finalPatch.destination_source = patch.destination ? 'user' : 'ai'
        finalPatch.country = code ? (patch.destination ?? null) : null
        finalPatch.country_code = code
      }
      let updated = await updateTrip(trip.id, finalPatch)
      if (destinationChanged && updated.destination) {
        updated = await refreshTripCover(updated, `${updated.destination} skyline`).catch(() => updated)
      }
      return updated
    },
    onSuccess: sync,
  })
}

export function useDeleteTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTrip(id),
    onSuccess: (_void, id) => {
      qc.removeQueries({ queryKey: qk.trip(id) })
      qc.removeQueries({ queryKey: qk.tickets(id) })
      void qc.invalidateQueries({ queryKey: qk.trips })
      void qc.invalidateQueries({ queryKey: qk.recentTickets })
      void qc.invalidateQueries({ queryKey: qk.stats })
    },
  })
}
