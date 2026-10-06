import { BedDouble, MapPin, Moon } from 'lucide-react'
import { DestinationImage } from '@/components/common/DestinationImage'
import { Detail, PlatformBadge, ReviewNotice, TicketShell, type TicketHandlers } from './parts'
import { daysBetween, formatShort, formatWeekday } from '@/utils/date'
import { detailsOf } from '@/utils/ticket'
import { plural } from '@/lib/utils'
import type { Ticket } from '@/types'

export function HotelCard({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  const data = detailsOf(ticket, 'hotel')
  const name = ticket.title ?? ticket.provider_name ?? data?.hotel.name ?? 'Hotel stay'
  const city = ticket.destination ?? data?.hotel.city ?? null
  const country = data?.hotel.country ?? ticket.structured_data?.primary_location.country ?? null
  const checkIn = ticket.travel_date ?? data?.check_in.date ?? null
  const checkOut = ticket.end_date ?? data?.check_out.date ?? null
  const nights = data?.nights ?? (daysBetween(checkIn, checkOut) || null)

  return (
    <TicketShell ticket={ticket} handlers={handlers} openLabel="Open booking">
      <DestinationImage src={ticket.image_url} seed={city ?? name} alt={name} className="aspect-[16/9]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#111] backdrop-blur">
          <BedDouble className="size-3.5" aria-hidden /> Hotel
        </span>
        <span className="absolute right-4 top-4">
          <PlatformBadge ticket={ticket} tone="glass" />
        </span>
      </DestinationImage>

      <div className="px-5 pt-4">
        <h3 className="text-lg font-semibold leading-snug tracking-tight">{name}</h3>
        {city || country ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{[city, country].filter(Boolean).join(', ')}</span>
          </p>
        ) : null}
      </div>

      <ReviewNotice ticket={ticket} />

      <div className="mx-5 mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-surface-2/70 p-4">
        <Stay label="Check-in" date={checkIn} time={ticket.start_time ?? data?.check_in.time ?? null} />
        <div className="flex flex-col items-center text-muted">
          <span className="h-px w-8 bg-line-strong" />
          {nights ? (
            <span className="mt-1.5 inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium">
              <Moon className="size-3" aria-hidden />
              {plural(nights, 'night')}
            </span>
          ) : null}
        </div>
        <Stay label="Check-out" date={checkOut} time={ticket.end_time ?? data?.check_out.time ?? null} align="right" />
      </div>

      <dl className="grid grid-cols-2 gap-4 px-5 pb-1 pt-4">
        <Detail label="Confirmation" value={ticket.booking_reference} mono copy={ticket.booking_reference} className="col-span-2" />
        <Detail label="Room" value={data?.room_type} />
        <Detail label="Guests" value={data?.guests ? plural(data.guests, 'guest') : null} />
      </dl>
      {data?.hotel.address ? <p className="px-5 pt-3 text-[13px] leading-relaxed text-muted">{data.hotel.address}</p> : null}
    </TicketShell>
  )
}

function Stay({ label, date, time, align }: { label: string; date: string | null; time: string | null; align?: 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-faint">{label}</p>
      <p className="mt-1 text-[17px] font-semibold tracking-tight">{date ? formatShort(date) : '—'}</p>
      <p className="text-xs text-muted">
        {[date ? formatWeekday(date) : null, time ? `${align === 'right' ? 'until' : 'from'} ${time}` : null].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}
