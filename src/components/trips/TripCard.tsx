import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DestinationImage } from '@/components/common/DestinationImage'
import { Skeleton } from '@/components/ui/misc'
import { cn, plural } from '@/lib/utils'
import { Flag } from '@/components/common/Flag'
import { formatRange, relativeDay, todayISO } from '@/utils/date'
import { typeSummary } from '@/utils/ticket'
import type { TripWithStats } from '@/types'

export function TripCard({ trip, className, priority }: { trip: TripWithStats; className?: string; priority?: boolean }) {
  const bookings = trip.tickets.filter((t) => t.processing_status !== 'failed').length
  const chips = typeSummary(trip.tickets.map((t) => t.document_type))
  const processing = trip.tickets.some((t) => t.processing_status === 'processing' || t.processing_status === 'uploaded')
  const today = todayISO()
  const ongoing = trip.start_date && trip.start_date <= today && (trip.end_date ?? trip.start_date) >= today
  const when = ongoing ? 'Happening now' : trip.start_date && trip.start_date > today ? relativeDay(trip.start_date) : null
  const heading = trip.destination ?? trip.name

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} className={className}>
      <Link
        to={`/app/trip/${trip.id}`}
        className="group block overflow-hidden rounded-[28px] bg-surface shadow-card outline-none ring-offset-2 ring-offset-bg transition-shadow hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ink"
        aria-label={`${trip.name}${trip.destination ? `, ${trip.destination}` : ''}`}
      >
        <DestinationImage
          src={trip.cover_image_url}
          seed={trip.destination ?? trip.name}
          alt=""
          priority={priority}
          className="aspect-[4/5] sm:aspect-[5/6]"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10" />
          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
            {when ? (
              <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">{when}</span>
            ) : (
              <span />
            )}
            {processing ? (
              <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                <span className="mr-1.5 inline-block size-1.5 animate-pulse-soft rounded-full bg-sun align-middle" />
                Organising…
              </span>
            ) : null}
          </div>

          <div className="absolute inset-x-5 bottom-5 text-white">
            {trip.destination && trip.name !== trip.destination ? (
              <p className="mb-1 truncate text-[13px] font-medium text-white/75">{trip.name}</p>
            ) : null}
            <h3 className="flex items-center gap-2 text-[28px] font-semibold leading-[1.05] tracking-[-0.03em]">
              <Flag code={trip.country_code} />
              <span className="truncate">{heading}</span>
            </h3>
            {trip.country && trip.country !== trip.destination ? <p className="mt-0.5 text-sm text-white/75">{trip.country}</p> : null}

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-3.5 text-[13px]">
              <span className="truncate font-medium">{formatRange(trip.start_date, trip.end_date) || 'Dates to be found'}</span>
              <span className="shrink-0 text-white/75">{plural(bookings, 'booking')}</span>
            </div>
            {chips.length ? (
              <p className="mt-1.5 truncate text-xs text-white/65">{chips.join(' • ')}</p>
            ) : (
              <p className="mt-1.5 text-xs text-white/65">Upload a ticket to get started</p>
            )}
          </div>
        </DestinationImage>
      </Link>
    </motion.div>
  )
}

export function TripCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-[28px] bg-surface shadow-card', className)} aria-hidden>
      <div className="relative aspect-[4/5] sm:aspect-[5/6]">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute inset-x-5 bottom-5 space-y-2.5">
          <div className="h-3 w-20 rounded-full bg-white/40 dark:bg-white/10" />
          <div className="h-7 w-36 rounded-full bg-white/50 dark:bg-white/10" />
          <div className="h-3 w-full rounded-full bg-white/30 dark:bg-white/10" />
        </div>
      </div>
    </div>
  )
}
