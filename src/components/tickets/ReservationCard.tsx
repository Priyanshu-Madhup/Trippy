import { CalendarDays, MapPin } from 'lucide-react'
import { DestinationImage } from '@/components/common/DestinationImage'
import { Detail, PlatformBadge, ReviewNotice, TicketShell, type TicketHandlers } from './parts'
import { formatFull } from '@/utils/date'
import { detailsOf, TYPE_META } from '@/utils/ticket'
import { cn, plural } from '@/lib/utils'
import type { Ticket } from '@/types'

/** Activities, attractions, events and restaurant reservations. */
export function ReservationCard({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  const kind = ticket.document_type === 'restaurant' ? 'restaurant' : 'activity'
  const meta = TYPE_META[kind]
  const Icon = meta.icon
  const activity = kind === 'activity' ? detailsOf(ticket, 'activity') : null
  const restaurant = kind === 'restaurant' ? detailsOf(ticket, 'restaurant') : null

  const title = ticket.title ?? activity?.name ?? restaurant?.name ?? meta.label
  const venue = activity?.venue && activity.venue !== title ? activity.venue : null
  const address = activity?.address ?? restaurant?.address ?? null
  const city = ticket.destination ?? activity?.city ?? restaurant?.city ?? null
  const date = ticket.travel_date
  const time = [ticket.start_time, ticket.end_time].filter(Boolean).join(' – ')

  return (
    <TicketShell ticket={ticket} handlers={handlers} openLabel={kind === 'restaurant' ? 'Open reservation' : 'Open ticket'}>
      {ticket.image_url ? (
        <DestinationImage src={ticket.image_url} seed={city ?? title} alt={title} className="aspect-[2/1]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </DestinationImage>
      ) : null}

      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', meta.tone)}>
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{meta.label}</p>
            <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{title}</h3>
            {venue || city ? (
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{[venue, city].filter(Boolean).join(', ')}</span>
              </p>
            ) : null}
          </div>
        </div>
        <PlatformBadge ticket={ticket} />
      </header>

      <ReviewNotice ticket={ticket} />

      {date || time ? (
        <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl bg-surface-2/70 px-4 py-3">
          <CalendarDays className="size-5 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{date ? formatFull(date) : 'Date not provided'}</p>
            {time ? <p className="font-mono text-[13px] text-muted tabular">{time}</p> : null}
          </div>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-4 px-5 pb-1 pt-4">
        <Detail label="Reference" value={ticket.booking_reference} mono copy={ticket.booking_reference} />
        <Detail
          label={kind === 'restaurant' ? 'Party' : 'Tickets'}
          value={
            restaurant?.party_size
              ? plural(restaurant.party_size, 'guest')
              : activity?.ticket_count
                ? plural(activity.ticket_count, 'ticket')
                : null
          }
        />
      </dl>
      {address ? <p className="px-5 pt-3 text-[13px] leading-relaxed text-muted">{address}</p> : null}
    </TicketShell>
  )
}
