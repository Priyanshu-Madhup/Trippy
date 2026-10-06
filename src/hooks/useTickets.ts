import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { backend } from '@/services/backend'
import { updateTripFromTicket } from '@/services/processing'
import { deleteTicket, getRecentTickets, getTicketFileUrl, getTickets, updateTicket } from '@/services/tickets'
import type { Ticket, TicketPatch } from '@/types'

export function useTickets(tripId: string | undefined) {
  return useQuery({
    queryKey: qk.tickets(tripId ?? ''),
    queryFn: () => getTickets(tripId as string),
    enabled: !!tripId,
    // Safety net when Realtime isn't available: poll while anything is processing.
    refetchInterval: (query) =>
      query.state.data?.some((t) => t.processing_status === 'processing' || t.processing_status === 'uploaded') ? 5000 : false,
  })
}

export function useRecentTickets(limit = 6) {
  return useQuery({ queryKey: qk.recentTickets, queryFn: () => getRecentTickets(limit) })
}

export function useStats() {
  return useQuery({ queryKey: qk.stats, queryFn: () => backend.getStats() })
}

/** Signed URL for the original file (cached for most of its 1h lifetime). */
export function useFileUrl(path: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.fileUrl(path ?? ''),
    queryFn: () => getTicketFileUrl(path as string),
    enabled: !!path && enabled,
    staleTime: 45 * 60_000,
    gcTime: 50 * 60_000,
  })
}

export function useInvalidateTripData() {
  const qc = useQueryClient()
  return (tripId: string) => {
    void qc.invalidateQueries({ queryKey: qk.tickets(tripId) })
    void qc.invalidateQueries({ queryKey: qk.trip(tripId) })
    void qc.invalidateQueries({ queryKey: qk.places(tripId) })
    void qc.invalidateQueries({ queryKey: qk.trips })
    void qc.invalidateQueries({ queryKey: qk.recentTickets })
    void qc.invalidateQueries({ queryKey: qk.stats })
  }
}

/** Live updates for a trip (Supabase Realtime, or local events in demo mode). */
export function useTripRealtime(tripId: string | undefined) {
  const invalidate = useInvalidateTripData()
  useEffect(() => {
    if (!tripId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = backend.subscribeToTrip(tripId, () => {
      clearTimeout(timer)
      timer = setTimeout(() => invalidate(tripId), 250)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [tripId])
}

export function useUpdateTicket() {
  const qc = useQueryClient()
  const invalidate = useInvalidateTripData()
  return useMutation({
    mutationFn: ({ ticket, patch }: { ticket: Ticket; patch: TicketPatch }) => updateTicket(ticket.id, patch),
    onSuccess: (updated) => {
      qc.setQueryData<Ticket[]>(qk.tickets(updated.trip_id), (list) => list?.map((t) => (t.id === updated.id ? updated : t)))
      // Edited dates / places can change the trip itself.
      void updateTripFromTicket(updated.trip_id)
        .catch(() => undefined)
        .finally(() => invalidate(updated.trip_id))
    },
  })
}

export function useDeleteTicket() {
  const qc = useQueryClient()
  const invalidate = useInvalidateTripData()
  return useMutation({
    mutationFn: (ticket: Ticket) => deleteTicket(ticket.id),
    onMutate: async (ticket) => {
      await qc.cancelQueries({ queryKey: qk.tickets(ticket.trip_id) })
      const previous = qc.getQueryData<Ticket[]>(qk.tickets(ticket.trip_id))
      qc.setQueryData<Ticket[]>(qk.tickets(ticket.trip_id), (list) => list?.filter((t) => t.id !== ticket.id))
      return { previous }
    },
    onError: (_err, ticket, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.tickets(ticket.trip_id), ctx.previous)
    },
    onSuccess: (_v, ticket) => {
      if (ticket.file_path) qc.removeQueries({ queryKey: qk.fileUrl(ticket.file_path) })
      void updateTripFromTicket(ticket.trip_id)
        .catch(() => undefined)
        .finally(() => invalidate(ticket.trip_id))
    },
  })
}
