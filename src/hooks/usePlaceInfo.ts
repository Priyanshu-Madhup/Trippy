import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/services/api'
import type { PlaceInfo } from '@/types/place'

/** Weather, news and an overview for a destination (cached for 15 minutes). */
export function usePlaceInfo(place: string | null | undefined) {
  return useQuery({
    queryKey: ['place-info', place?.toLowerCase()],
    queryFn: () => apiFetch<PlaceInfo>(`/api/place-info?q=${encodeURIComponent(place as string)}`),
    enabled: !!place,
    // Retry soon if a source was unavailable; otherwise weather/news stay fresh for 15 min.
    staleTime: (q) => (q.state.data?.weather && q.state.data.news.length ? 15 * 60_000 : 30_000),
    refetchOnWindowFocus: true,
    gcTime: 60 * 60_000,
    retry: 1,
  })
}
