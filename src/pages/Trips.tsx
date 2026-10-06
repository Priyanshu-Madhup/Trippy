import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { SearchBar } from '@/components/common/SearchFilter'
import { Segmented } from '@/components/ui/misc'
import { TripCard, TripCardSkeleton } from '@/components/trips/TripCard'
import { useTrips } from '@/hooks/useTrips'
import { useUI } from '@/hooks/useUI'
import { todayISO } from '@/utils/date'

type Scope = 'all' | 'upcoming' | 'past'

export default function Trips() {
  const { data: trips, isLoading } = useTrips()
  const { openCreateTrip } = useUI()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')

  const list = useMemo(() => {
    const today = todayISO()
    const q = query.trim().toLowerCase()
    return (trips ?? [])
      .filter((t) => {
        const end = t.end_date ?? t.start_date
        if (scope === 'upcoming' && end && end < today) return false
        if (scope === 'past' && (!end || end >= today)) return false
        return !q || [t.name, t.destination, t.country].filter(Boolean).join(' ').toLowerCase().includes(q)
      })
      .sort((a, b) => (b.start_date ?? '9999').localeCompare(a.start_date ?? '9999'))
  }, [trips, query, scope])

  return (
    <div className="mx-auto max-w-6xl px-4 pt-safe sm:px-6 lg:px-10">
      <header className="flex items-end justify-between gap-4 pb-6 pt-8 lg:pt-12">
        <div>
          <h1 className="text-[34px] font-semibold leading-none tracking-[-0.04em] sm:text-[44px]">Your journeys</h1>
          <p className="mt-2 text-[15px] text-muted">Everything you need, in one place.</p>
        </div>
        <Button onClick={openCreateTrip} className="shrink-0">
          <Plus aria-hidden /> <span className="hidden sm:inline">New trip</span>
          <span className="sm:hidden">New</span>
        </Button>
      </header>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="Search trips or places" className="flex-1" />
        <Segmented
          label="Show"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'All' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      ) : list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((trip, i) => (
            <TripCard key={trip.id} trip={trip} priority={i < 3} />
          ))}
        </div>
      ) : (trips?.length ?? 0) === 0 ? (
        <EmptyState
          title="Your next adventure starts here."
          description="Create a trip and keep every booking, ticket and reservation together."
          action={
            <Button size="lg" onClick={openCreateTrip}>
              <Plus aria-hidden /> Create your first trip
            </Button>
          }
        />
      ) : (
        <p className="py-16 text-center text-muted">No trips match your search.</p>
      )}
    </div>
  )
}
