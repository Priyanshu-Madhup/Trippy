import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

/** Centralised query keys so invalidation stays consistent. */
export const qk = {
  trips: ['trips'] as const,
  trip: (id: string) => ['trips', id] as const,
  tickets: (tripId: string) => ['tickets', 'trip', tripId] as const,
  recentTickets: ['tickets', 'recent'] as const,
  ticket: (id: string) => ['tickets', 'one', id] as const,
  places: (tripId: string) => ['places', tripId] as const,
  profile: ['profile'] as const,
  stats: ['stats'] as const,
  fileUrl: (path: string) => ['file-url', path] as const,
}
