import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, CircleAlert, Info } from 'lucide-react'
import { DestinationImage } from '@/components/common/DestinationImage'
import { Flag } from '@/components/common/Flag'
import { Skeleton } from '@/components/ui/misc'
import { useTickets } from '@/hooks/useTickets'
import { cn, plural } from '@/lib/utils'
import { daysBetween, formatRange, formatShort, relativeDay, todayISO } from '@/utils/date'
import { chronoKey, ticketView } from '@/utils/ticket'
import type { Ticket, Trip, TripWithStats } from '@/types'

export function NextTripHero({ trip }: { trip: TripWithStats }) {
  const today = todayISO()
  const ongoing = !!trip.start_date && trip.start_date <= today && (trip.end_date ?? trip.start_date) >= today
  const countdown = daysBetween(today, trip.start_date)
  const bookings = trip.tickets.filter((t) => t.processing_status === 'completed').length

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}>
      <Link
        to={`/app/trip/${trip.id}`}
        className="group block overflow-hidden rounded-[30px] shadow-card outline-none transition-shadow hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ink"
        aria-label={`Open ${trip.name}`}
      >
        <DestinationImage
          src={trip.cover_image_url}
          seed={trip.destination ?? trip.name}
          alt=""
          priority
          className="grain h-[340px] sm:h-[380px]"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
          <span className="absolute left-5 top-5 rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            {ongoing ? 'Happening now' : 'Your next trip'}
          </span>
          {!ongoing && countdown !== null && countdown > 0 ? (
            <div className="absolute right-5 top-4 text-right text-white">
              <p className="text-[40px] font-semibold leading-none tracking-[-0.05em] tabular">{countdown}</p>
              <p className="text-xs font-medium text-white/75">{countdown === 1 ? 'day to go' : 'days to go'}</p>
            </div>
          ) : null}
          <div className="absolute inset-x-6 bottom-6 text-white">
            <p className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Flag code={trip.country_code} />
              {trip.destination ? trip.name : 'Trip'}
              {trip.country && trip.country !== trip.destination ? <span className="text-white/60">· {trip.country}</span> : null}
            </p>
            <h2 className="mt-1 break-words text-[44px] font-semibold uppercase leading-[0.92] tracking-[-0.045em] sm:text-[58px]">
              {trip.destination ?? trip.name}
            </h2>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-3.5">
              <p className="text-[15px] font-medium">
                {formatRange(trip.start_date, trip.end_date).toUpperCase() || 'Dates will appear as you add tickets'}
                <span className="ml-3 text-white/65">{plural(bookings, 'booking')}</span>
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#111] transition group-hover:gap-2.5">
                Open trip <ArrowRight className="size-4" aria-hidden />
              </span>
            </div>
          </div>
        </DestinationImage>
      </Link>
    </motion.div>
  )
}

/** The bookings that matter next for a trip, in travel order. */
export function TripEssentials({ trip }: { trip: Trip }) {
  const { data: tickets, isLoading } = useTickets(trip.id)
  const today = todayISO()
  const list = (tickets ?? [])
    .filter((t) => t.processing_status !== 'completed' || !t.travel_date || (t.end_date ?? t.travel_date) >= today)
    .sort((a, b) => chronoKey(a).localeCompare(chronoKey(b)))
    .slice(0, 6)
  const attention = (tickets ?? []).filter((t) => t.processing_status === 'failed' || t.needs_review).length

  return (
    <section className="rounded-[26px] border border-line bg-surface p-5 shadow-soft sm:p-6" aria-label="Tickets for this trip">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Tickets for this trip</h2>
          <p className="text-[13px] text-muted">What you’ll need, in order.</p>
        </div>
        <Link to={`/app/trip/${trip.id}`} className="inline-flex shrink-0 items-center text-sm font-medium text-muted hover:text-ink">
          All <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      {attention ? (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-warning-bg px-3 py-2 text-[13px] text-warning">
          <Info className="size-4 shrink-0" aria-hidden /> {plural(attention, 'ticket')} need a quick check.
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl bg-surface-2/70 p-5 text-center">
          <p className="text-sm font-medium">No tickets yet</p>
          <p className="mt-1 text-[13px] text-muted">Open the trip to upload flights, hotels and bookings.</p>
          <Link
            to={`/app/trip/${trip.id}`}
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink"
          >
            Open trip <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <ul className="-mx-2">
          {list.map((t) => (
            <EssentialRow key={t.id} ticket={t} />
          ))}
        </ul>
      )}
    </section>
  )
}

function EssentialRow({ ticket }: { ticket: Ticket }) {
  const view = ticketView(ticket)
  const Icon = view.meta.icon
  const failed = ticket.processing_status === 'failed'
  const pending = ticket.processing_status === 'processing' || ticket.processing_status === 'uploaded'
  return (
    <li>
      <Link
        to={`/app/trip/${ticket.trip_id}#ticket-${ticket.id}`}
        className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface-2/70"
      >
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', failed ? 'bg-danger-bg text-danger' : view.meta.tone)}>
          {failed ? <CircleAlert className="size-[18px]" aria-hidden /> : <Icon className="size-[18px]" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{pending || failed ? (ticket.file_name ?? view.title) : view.title}</span>
          <span className="block truncate text-[13px] text-muted">
            {failed ? 'Couldn’t read — tap to retry' : pending ? 'Reading…' : [view.meta.label, view.provider, view.reference].filter(Boolean).join(' · ')}
          </span>
        </span>
        {view.date ? (
          <span className="shrink-0 text-right">
            <span className="block text-[13px] font-semibold">{formatShort(view.date)}</span>
            {view.time ? <span className="block font-mono text-xs text-muted tabular">{view.time}</span> : <span className="block text-xs text-muted">{relativeDay(view.date)}</span>}
          </span>
        ) : null}
      </Link>
    </li>
  )
}
