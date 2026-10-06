import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRight, ChevronRight, Plus, Settings, Sparkles } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { EmptyState } from '@/components/common/EmptyState'
import { DestinationImage } from '@/components/common/DestinationImage'
import { NextTripHero, TripEssentials } from '@/components/dashboard/NextTrip'
import { AboutPlace, PlaceNews, WeatherCard } from '@/components/dashboard/PlacePanels'
import { UserMenu } from '@/components/layout/UserMenu'
import { useDisplayName } from '@/hooks/useAuth'
import { usePlaceInfo } from '@/hooks/usePlaceInfo'
import { useTrips } from '@/hooks/useTrips'
import { useUI } from '@/hooks/useUI'
import { backend } from '@/services/backend'
import { enrichMissingVisuals } from '@/services/processing'
import { formatRange, greeting, relativeDay, todayISO } from '@/utils/date'
import type { TripWithStats } from '@/types'

/** Ongoing trip first, then the soonest upcoming one; undated trips come last. */
function upcomingTrips(trips: TripWithStats[]): TripWithStats[] {
  const today = todayISO()
  return trips
    .filter((t) => {
      const end = t.end_date ?? t.start_date
      return !end || end >= today
    })
    .sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'))
}

export default function Home() {
  const name = useDisplayName()
  const { openCreateTrip } = useUI()
  const { data: trips, isLoading, error, refetch } = useTrips()
  const upcoming = useMemo(() => upcomingTrips(trips ?? []), [trips])
  const next = upcoming[0]
  const firstName = name.split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl px-4 pt-safe sm:px-6 lg:px-10">
      <header className="flex items-center justify-between py-4 lg:py-8">
        <Link to="/app" className="lg:hidden" aria-label="Home">
          <Logo />
        </Link>
        <p className="hidden text-sm text-muted lg:block">
          {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
        </p>
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={openCreateTrip} className="hidden sm:inline-flex">
            <Plus aria-hidden /> New trip
          </Button>
          <Link to="/app/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2">
            <Settings className="size-5" />
          </Link>
          <UserMenu />
        </div>
      </header>

      <section className="pb-7 pt-3 sm:pt-5">
        <p className="text-[15px] font-medium text-muted">
          {greeting()}, {firstName}
        </p>
        <h1 className="mt-1 text-balance text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[48px] lg:text-[56px]">
          {next?.destination ? (
            <>
              {next.start_date && next.start_date > todayISO() ? 'Getting ready for ' : 'Enjoy '}
              <span className="font-serif font-normal italic tracking-[-0.02em]">{next.destination}.</span>
            </>
          ) : (
            <>
              Where are you going <span className="font-serif font-normal italic tracking-[-0.02em]">next?</span>
            </>
          )}
        </h1>
      </section>

      {error ? (
        <div className="rounded-[26px] border border-line bg-surface p-8 text-center">
          <p className="font-semibold">We couldn’t load your trips.</p>
          <p className="mt-1 text-sm text-muted">{error instanceof Error ? error.message : 'Please try again.'}</p>
          <Button variant="secondary" className="mt-5" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <DashboardSkeleton />
      ) : !trips?.length ? (
        <NoTrips onCreate={openCreateTrip} />
      ) : !next ? (
        <NoUpcoming onCreate={openCreateTrip} />
      ) : (
        <Dashboard next={next} others={upcoming.slice(1, 4)} />
      )}
    </div>
  )
}

function Dashboard({ next, others }: { next: TripWithStats; others: TripWithStats[] }) {
  const place = next.destination
  const { data: info, isLoading } = usePlaceInfo(place)

  return (
    <div className="space-y-10 pb-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <NextTripHero trip={next} />
        {place ? (
          <WeatherCard place={place} info={info} loading={isLoading} />
        ) : (
          <div className="rounded-[26px] border border-dashed border-line-strong p-6 text-sm text-muted">
            Upload a ticket to this trip and we’ll detect the destination — weather and local news will appear here.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <TripEssentials trip={next} />
        {place ? <AboutPlace info={info} loading={isLoading} /> : null}
      </div>

      {place ? <PlaceNews place={place} info={info} loading={isLoading} /> : null}

      {others.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Also coming up</h2>
            <Link to="/app/trips" className="inline-flex items-center gap-0.5 text-sm font-medium text-muted hover:text-ink">
              All trips <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {others.map((t) => (
              <Link
                key={t.id}
                to={`/app/trip/${t.id}`}
                className="group flex items-center gap-3 rounded-[22px] border border-line bg-surface p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <DestinationImage src={t.cover_image_url} seed={t.destination ?? t.name} alt="" className="size-16 shrink-0 rounded-2xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{t.destination ?? t.name}</span>
                  <span className="block truncate text-[13px] text-muted">{formatRange(t.start_date, t.end_date) || t.name}</span>
                  {t.start_date ? <span className="block text-xs text-faint">{relativeDay(t.start_date)}</span> : null}
                </span>
                <ArrowRight className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <Link to="/app/trips" className="flex items-center justify-between rounded-[22px] border border-line bg-surface px-5 py-4 text-sm font-medium shadow-soft transition hover:bg-surface-2/60">
          See all your trips <ChevronRight className="size-4 text-muted" aria-hidden />
        </Link>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]" aria-hidden>
      <Skeleton className="h-[340px] rounded-[30px] sm:h-[380px]" />
      <Skeleton className="h-[300px] rounded-[26px]" />
    </div>
  )
}

function NoUpcoming({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-[32px] border border-line bg-surface shadow-soft">
      <EmptyState
        title="No upcoming trips."
        description="Plan your next journey — your past trips are still in the Trips section."
        action={
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <Button size="lg" onClick={onCreate}>
              <Plus aria-hidden /> Create a trip
            </Button>
            <Link to="/app/trips" className="inline-flex h-11 items-center px-4 text-sm font-medium text-muted hover:text-ink">
              View past trips
            </Link>
          </div>
        }
      />
    </div>
  )
}

function NoTrips({ onCreate }: { onCreate: () => void }) {
  const qc = useQueryClient()
  const [seeding, setSeeding] = useState(false)
  return (
    <div className="rounded-[32px] border border-line bg-surface shadow-soft">
      <EmptyState
        title="Your next adventure starts here."
        description="Create a trip, then upload your tickets inside it — we’ll read them and organise everything for you."
        action={
          <div className="flex flex-col items-center gap-3">
            <Button size="lg" onClick={onCreate}>
              <Plus aria-hidden /> Create your first trip
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={seeding}
              onClick={async () => {
                setSeeding(true)
                try {
                  await backend.seedSampleData()
                  await qc.invalidateQueries()
                  toast.success('Sample trips added')
                  void enrichMissingVisuals().then(() => qc.invalidateQueries())
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not add sample trips.')
                } finally {
                  setSeeding(false)
                }
              }}
            >
              <Sparkles aria-hidden /> Or explore with sample trips
            </Button>
          </div>
        }
      />
    </div>
  )
}
