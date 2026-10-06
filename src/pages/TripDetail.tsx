import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { MapPin, Plus, SearchX } from 'lucide-react'
import { TripHero, TripHeroSkeleton } from '@/components/trips/TripHero'
import { TripTimeline, scrollToTicket } from '@/components/trips/TripTimeline'
import { TicketCard, type TicketHandlers } from '@/components/tickets/TicketCard'
import { TicketCardSkeleton } from '@/components/tickets/StatusCards'
import { TicketViewer, downloadTicket } from '@/components/tickets/TicketViewer'
import { TicketEditModal } from '@/components/tickets/TicketEditModal'
import { ProcessingCard } from '@/components/upload/ProcessingState'
import { UploadDropzone } from '@/components/upload/UploadDropzone'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FilterTabs, SearchBar, SortMenu, type SortKey } from '@/components/common/SearchFilter'
import { Button, buttonVariants } from '@/components/ui/button'
import { usePlaces, useDeleteTrip, useTrip } from '@/hooks/useTrips'
import { useDeleteTicket, useTickets, useTripRealtime } from '@/hooks/useTickets'
import { useUploads } from '@/hooks/useUpload'
import { useUI } from '@/hooks/useUI'
import { FILTERS, TYPE_META, chronoKey, matchesFilter, ticketSearchText, type FilterKey } from '@/utils/ticket'
import { cn, plural } from '@/lib/utils'
import type { Ticket, Trip } from '@/types'

const TYPE_ORDER = ['flight', 'train', 'bus', 'hotel', 'activity', 'restaurant', 'generic_travel_document', 'unknown']

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { openEditTrip } = useUI()
  const { items, enqueue, retry, dismiss } = useUploads()

  const { data: trip, isLoading: tripLoading, error: tripError } = useTrip(tripId)
  const { data: tickets, isLoading: ticketsLoading } = useTickets(tripId)
  useTripRealtime(tripId)

  const deleteTicket = useDeleteTicket()
  const deleteTrip = useDeleteTrip()

  const [viewing, setViewing] = useState<Ticket | null>(null)
  const [editing, setEditing] = useState<Ticket | null>(null)
  const [confirmTicket, setConfirmTicket] = useState<Ticket | null>(null)
  const [confirmTrip, setConfirmTrip] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('date')

  // Uploads for this trip. Tickets that are mid-pipeline render as live processing cards.
  const queue = items.filter((i) => i.tripId === tripId && !(i.stage === 'failed' && i.ticketId))
  const queuedKey = queue
    .map((i) => i.ticketId)
    .filter(Boolean)
    .sort()
    .join(',')
  const all = useMemo(() => {
    const queued = new Set(queuedKey.split(','))
    return (tickets ?? []).filter((t) => !queued.has(t.id))
  }, [tickets, queuedKey])
  const bookings = (tickets ?? []).filter((t) => t.processing_status === 'completed').length

  const counts = useMemo(() => {
    const c: Partial<Record<FilterKey, number>> = {}
    for (const f of FILTERS) c[f.key] = all.filter((t) => matchesFilter(t.document_type, f.key)).length
    return c
  }, [all])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = all.filter((t) => matchesFilter(t.document_type, filter) && (!q || ticketSearchText(t).includes(q)))
    if (sort === 'recent') return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (sort === 'type')
      return [...list].sort(
        (a, b) => TYPE_ORDER.indexOf(a.document_type) - TYPE_ORDER.indexOf(b.document_type) || chronoKey(a).localeCompare(chronoKey(b)),
      )
    return [...list].sort((a, b) => chronoKey(a).localeCompare(chronoKey(b)))
  }, [all, query, filter, sort])

  // Deep link from "Recent tickets": /app/trip/:id#ticket-<id>
  const scrolled = useRef(false)
  useEffect(() => {
    if (scrolled.current || !tickets?.length || !location.hash.startsWith('#ticket-')) return
    scrolled.current = true
    setTimeout(() => scrollToTicket(location.hash.slice('#ticket-'.length)), 300)
  }, [tickets, location.hash])

  const handlers: TicketHandlers = {
    onOpen: setViewing,
    onEdit: setEditing,
    onDelete: setConfirmTicket,
    onRetry: (t) => retry(t),
    onDownload: (t) => void downloadTicket(t),
  }

  const onFiles = (files: File[]) => tripId && enqueue(tripId, files)

  if (tripError || (!tripLoading && !trip)) {
    return (
      <EmptyState
        className="min-h-[70dvh] justify-center"
        title="Trip not found"
        description="It may have been deleted, or the link is incomplete."
        action={
          <Link to="/app" className={buttonVariants()}>
            Back to your trips
          </Link>
        }
      />
    )
  }

  const empty = !ticketsLoading && (tickets?.length ?? 0) === 0 && queue.length === 0

  return (
    <div className="pb-8">
      {trip ? (
        <TripHero
          trip={trip}
          bookings={bookings}
          onEdit={() => openEditTrip(trip)}
          onDelete={() => setConfirmTrip(true)}
          onUpload={() => document.getElementById('trip-upload')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        />
      ) : (
        <TripHeroSkeleton />
      )}

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {/* Live processing */}
          <AnimatePresence initial={false}>
            {queue.length ? (
              <motion.div layout className="mb-8 grid gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnimatePresence>
                  {queue.map((item) => (
                    <ProcessingCard key={item.key} item={item} onDismiss={() => dismiss(item.key)} />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {ticketsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <TicketCardSkeleton />
              <TicketCardSkeleton />
            </div>
          ) : empty ? (
            <div id="trip-upload">
              <EmptyState
                className="pb-8 pt-4"
                title="Your trip starts here."
                description="Upload your first ticket or booking confirmation and we’ll organize everything for you."
              />
              <UploadDropzone onFiles={onFiles} />
            </div>
          ) : (
            <>
              <section aria-labelledby="tickets-heading">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h2 id="tickets-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
                    Your tickets
                  </h2>
                  <span className="text-sm text-muted">{plural(all.length, 'item')}</span>
                </div>
                <div className="mb-4 flex gap-2">
                  <SearchBar value={query} onChange={setQuery} placeholder="Search tickets, PNRs, places…" className="flex-1" />
                  <SortMenu value={sort} onChange={setSort} />
                </div>
                <div className="mb-6">
                  <FilterTabs label="Filter tickets" value={filter} onChange={setFilter} options={FILTERS} counts={counts} />
                </div>

                {visible.length ? (
                  <motion.div layout className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                      {visible.map((t) => (
                        <TicketCard key={t.id} ticket={t} handlers={handlers} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <div className="rounded-[26px] border border-dashed border-line-strong py-14 text-center">
                    <SearchX className="mx-auto size-8 text-faint" aria-hidden />
                    <p className="mt-3 font-semibold">No matching tickets</p>
                    <button
                      className="mt-1 text-sm text-muted underline-offset-4 hover:underline"
                      onClick={() => {
                        setQuery('')
                        setFilter('all')
                      }}
                    >
                      Clear search and filters
                    </button>
                  </div>
                )}
              </section>

              {all.some((t) => t.processing_status === 'completed') ? (
                <section className="mt-12" aria-labelledby="itinerary-heading">
                  <h2 id="itinerary-heading" className="mb-3 text-xl font-semibold tracking-tight sm:text-2xl">
                    Itinerary
                  </h2>
                  <TripTimeline tickets={all} />
                </section>
              ) : null}

              <div id="trip-upload" className="mt-10 lg:hidden">
                <UploadDropzone variant="compact" onFiles={onFiles} title="Add another ticket" />
              </div>
            </>
          )}
        </div>

        {/* Desktop summary */}
        {trip && !empty ? <TripSummary trip={trip} tickets={tickets ?? []} onFiles={onFiles} /> : null}
      </div>

      {/* Floating upload button on phones */}
      {!empty ? (
        <label className="fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] right-4 z-30 inline-flex h-13 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-ink shadow-float transition active:scale-95 lg:hidden">
          <Plus className="size-5" aria-hidden />
          Upload
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) onFiles(Array.from(e.target.files))
              e.target.value = ''
            }}
          />
        </label>
      ) : null}

      <TicketViewer ticket={viewing} onClose={() => setViewing(null)} />
      <TicketEditModal ticket={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!confirmTicket}
        onOpenChange={(o) => !o && setConfirmTicket(null)}
        title="Delete this ticket?"
        description="The card and the original file will be permanently removed."
        loading={deleteTicket.isPending}
        onConfirm={async () => {
          if (!confirmTicket) return
          try {
            await deleteTicket.mutateAsync(confirmTicket)
            toast.success('Ticket deleted')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not delete the ticket.')
          } finally {
            setConfirmTicket(null)
          }
        }}
      />
      <ConfirmDialog
        open={confirmTrip}
        onOpenChange={setConfirmTrip}
        title="Delete this trip?"
        description={`“${trip?.name ?? 'This trip'}” and all of its tickets and files will be permanently removed.`}
        confirmLabel="Delete trip"
        loading={deleteTrip.isPending}
        onConfirm={async () => {
          if (!tripId) return
          try {
            await deleteTrip.mutateAsync(tripId)
            toast.success('Trip deleted')
            navigate('/app', { replace: true })
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not delete the trip.')
          } finally {
            setConfirmTrip(false)
          }
        }}
      />
    </div>
  )
}

function TripSummary({ trip, tickets, onFiles }: { trip: Trip; tickets: Ticket[]; onFiles: (files: File[]) => void }) {
  const { data: places } = usePlaces(trip.id)
  const done = tickets.filter((t) => t.processing_status === 'completed')
  const byType = TYPE_ORDER.map((type) => ({
    type,
    count: done.filter((t) => (type === 'generic_travel_document' ? t.document_type === type || t.document_type === 'unknown' : t.document_type === type)).length,
  })).filter((x) => x.count > 0 && x.type !== 'unknown')
  const cities = (places ?? []).filter((p) => p.place_type === 'city').map((p) => p.place_name)
  const review = done.filter((t) => t.needs_review).length

  return (
    <aside className="hidden lg:block" aria-label="Trip summary">
      <div className="sticky top-8 space-y-4">
        <div className="rounded-[26px] border border-line bg-surface p-5 shadow-soft">
          <h2 className="text-sm font-semibold">At a glance</h2>
          <ul className="mt-4 space-y-2.5">
            {byType.map(({ type, count }) => {
              const meta = TYPE_META[type as keyof typeof TYPE_META]
              const Icon = meta.icon
              return (
                <li key={type} className="flex items-center gap-3 text-sm">
                  <span className={cn('grid size-8 place-items-center rounded-lg', meta.tone)}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex-1">{meta.label}</span>
                  <span className="font-semibold tabular">{count}</span>
                </li>
              )
            })}
            {byType.length === 0 ? <li className="text-sm text-muted">Nothing processed yet.</li> : null}
          </ul>
          {review ? (
            <p className="mt-4 rounded-xl bg-warning-bg px-3 py-2 text-[13px] text-warning">
              {plural(review, 'ticket')} could use a quick check.
            </p>
          ) : null}
        </div>

        {cities.length ? (
          <div className="rounded-[26px] border border-line bg-surface p-5 shadow-soft">
            <h2 className="text-sm font-semibold">Places</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cities.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[13px]">
                  <MapPin className="size-3 text-muted" aria-hidden />
                  {c}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <UploadDropzone variant="compact" onFiles={onFiles} />
        <Button variant="ghost" size="sm" className="w-full text-muted" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to top
        </Button>
      </div>
    </aside>
  )
}
