import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronRight, Plus, Settings, Sparkles, Upload } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { EmptyState } from '@/components/common/EmptyState'
import { TripCard, TripCardSkeleton } from '@/components/trips/TripCard'
import { UploadDropzone } from '@/components/upload/UploadDropzone'
import { UserMenu } from '@/components/layout/UserMenu'
import { useDisplayName } from '@/hooks/useAuth'
import { useTrips } from '@/hooks/useTrips'
import { useRecentTickets } from '@/hooks/useTickets'
import { useUI } from '@/hooks/useUI'
import { useUploads } from '@/hooks/useUpload'
import { backend } from '@/services/backend'
import { enrichMissingVisuals } from '@/services/processing'
import { formatShort, greeting, todayISO } from '@/utils/date'
import { ticketView } from '@/utils/ticket'
import { cn } from '@/lib/utils'
import type { TicketWithTrip, TripWithStats } from '@/types'

export default function Home() {
  const name = useDisplayName()
  const { openCreateTrip, openUpload } = useUI()
  const { data: trips, isLoading, error, refetch } = useTrips()
  const { upcoming, past } = useMemo(() => splitTrips(trips ?? []), [trips])
  const firstName = name.split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl px-4 pt-safe sm:px-6 lg:px-10">
      {/* Top bar */}
      <header className="flex items-center justify-between py-4 lg:py-8">
        <Link to="/app" className="lg:hidden" aria-label="Home">
          <Logo />
        </Link>
        <p className="hidden text-sm text-muted lg:block">
          {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
        </p>
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={openCreateTrip} className="hidden sm:inline-flex">
            <Plus aria-hidden /> Add trip
          </Button>
          <Link to="/app/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2">
            <Settings className="size-5" />
          </Link>
          <UserMenu />
        </div>
      </header>

      {/* Greeting */}
      <section className="pb-8 pt-4 sm:pt-6">
        <p className="text-[15px] font-medium text-muted">
          {greeting()}, {firstName}
        </p>
        <h1 className="mt-1 text-balance text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[48px] lg:text-[56px]">
          Where are you going <span className="font-serif font-normal italic tracking-[-0.02em]">next?</span>
        </h1>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button size="lg" onClick={openCreateTrip}>
            <Plus aria-hidden /> Create new trip
          </Button>
          <Button size="lg" variant="secondary" onClick={() => openUpload()}>
            <Upload aria-hidden /> Upload ticket
          </Button>
        </div>
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
        <TripRow title="Upcoming trips">
          {[0, 1, 2].map((i) => (
            <TripCardSkeleton key={i} className="w-[78%] shrink-0 snap-start sm:w-auto" />
          ))}
        </TripRow>
      ) : trips && trips.length === 0 ? (
        <NoTrips onCreate={openCreateTrip} />
      ) : (
        <>
          {upcoming.length ? (
            <TripRow title="Upcoming trips" subtitle="Everything you need, in one place.">
              {upcoming.map((trip, i) => (
                <TripCard key={trip.id} trip={trip} priority={i < 2} className="w-[78%] shrink-0 snap-start sm:w-auto" />
              ))}
            </TripRow>
          ) : null}

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
            <RecentTickets />
            <QuickUpload trips={upcoming.length ? upcoming : past} />
          </div>

          {past.length ? (
            <div className="mt-14">
              <TripRow title="Past journeys">
                {past.map((trip) => (
                  <TripCard key={trip.id} trip={trip} className="w-[78%] shrink-0 snap-start sm:w-auto" />
                ))}
              </TripRow>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function splitTrips(trips: TripWithStats[]) {
  const today = todayISO()
  const upcoming: TripWithStats[] = []
  const past: TripWithStats[] = []
  for (const t of trips) {
    const end = t.end_date ?? t.start_date
    if (end && end < today) past.push(t)
    else upcoming.push(t)
  }
  upcoming.sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'))
  past.sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))
  return { upcoming, past }
}

function TripRow({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
        <Link to="/app/trips" className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-muted hover:text-ink">
          See all <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      {/* Horizontal snap carousel on phones, grid from sm up. */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {children}
      </div>
    </section>
  )
}

function RecentTickets() {
  const { data, isLoading } = useRecentTickets()
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">Recent tickets</h2>
      <div className="overflow-hidden rounded-[26px] border border-line bg-surface shadow-soft">
        {isLoading ? (
          <div className="divide-y divide-line">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <p className="p-6 text-sm text-muted">Tickets you upload will show up here.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.map((t, i) => (
              <RecentTicketRow key={t.id} ticket={t} index={i} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function RecentTicketRow({ ticket, index }: { ticket: TicketWithTrip; index: number }) {
  const view = ticketView(ticket)
  const Icon = view.meta.icon
  const status =
    ticket.processing_status === 'failed' ? 'Needs attention' : ticket.processing_status !== 'completed' ? 'Processing…' : null
  return (
    <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }}>
      <Link
        to={`/app/trip/${ticket.trip_id}#ticket-${ticket.id}`}
        className="flex items-center gap-3.5 p-4 transition-colors hover:bg-surface-2/60"
      >
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', view.meta.tone)}>
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{status ? (ticket.file_name ?? view.title) : view.title}</span>
          <span className="block truncate text-[13px] text-muted">
            {[status ?? view.meta.label, ticket.trip?.name, view.date ? formatShort(view.date) : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
      </Link>
    </motion.li>
  )
}

function QuickUpload({ trips }: { trips: TripWithStats[] }) {
  const navigate = useNavigate()
  const { enqueue } = useUploads()
  const target = trips[0]
  if (!target) return null
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">Quick upload</h2>
      <UploadDropzone
        variant="compact"
        title={`Add to ${target.name}`}
        onFiles={(files) => {
          enqueue(target.id, files)
          navigate(`/app/trip/${target.id}`)
        }}
      />
      <p className="mt-3 px-1 text-[13px] leading-relaxed text-muted">
        Drop a confirmation email PDF or a screenshot — we’ll recognise flights, hotels, trains, buses and more.
      </p>
    </section>
  )
}

function NoTrips({ onCreate }: { onCreate: () => void }) {
  const qc = useQueryClient()
  const [seeding, setSeeding] = useState(false)
  return (
    <div className="rounded-[32px] border border-line bg-surface shadow-soft">
      <EmptyState
        title="Your next adventure starts here."
        description="Create a trip and keep every booking, ticket and reservation together."
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
