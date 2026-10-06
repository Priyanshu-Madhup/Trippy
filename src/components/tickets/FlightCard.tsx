import { Plane } from 'lucide-react'
import { AirlineLogo } from '@/components/common/ProviderLogo'
import { Detail, Perforation, PlatformBadge, ReviewNotice, TicketShell, type TicketHandlers } from './parts'
import { durationLabel, formatPass, formatShort, formatWeekday } from '@/utils/date'
import { detailsOf, flightJourney } from '@/utils/ticket'
import { hashHue } from '@/lib/utils'
import type { Ticket } from '@/types'

export function FlightCard({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  const data = detailsOf(ticket, 'flight')
  const journey = flightJourney(data)
  const first = journey?.first
  const last = journey?.last

  // Columns hold user edits, so they win over the raw extraction.
  const fromCode = first?.departure.airport_code ?? null
  const toCode = last?.arrival.airport_code ?? null
  const fromCity = ticket.origin ?? first?.departure.city ?? null
  const toCity = ticket.destination ?? last?.arrival.city ?? null
  const depTime = ticket.start_time ?? first?.departure.time ?? null
  const arrTime = ticket.end_time ?? last?.arrival.time ?? null
  const depDate = ticket.travel_date ?? first?.departure.date ?? null
  const arrDate = last?.arrival.date ?? null
  const airline = ticket.airline_name ?? ticket.provider_name ?? data?.airline.name ?? null
  const code = ticket.airline_code ?? data?.airline.iata_code ?? null

  const flightNumbers = journey?.outbound.map((s) => s.flight_number).filter(Boolean).join(' · ') || null
  const cabin = first?.cabin_class ?? null
  const seat = journey?.outbound.map((s) => s.seat).filter(Boolean).join(' · ') || null
  const terminal = first?.departure.terminal ?? null
  const stops = journey?.stops ?? []
  const duration = journey?.outbound.length === 1 ? (first?.duration ?? durationLabel(depDate, depTime, arrDate, arrTime)) : null
  const dayShift = depDate && arrDate && arrDate > depDate ? '+1' : null
  const returnLeg = journey?.inbound[0]

  const hue = hashHue(airline ?? 'flight')
  const accent = `linear-gradient(90deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 65% 60%))`

  return (
    <TicketShell ticket={ticket} handlers={handlers} accent={accent}>
      {/* Airline + booking platform */}
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <AirlineLogo src={ticket.airline_logo_url} name={airline} code={code} size={44} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{airline ?? 'Flight'}</p>
            <p className="truncate text-[13px] text-muted">{[flightNumbers, cabin].filter(Boolean).join(' · ') || 'Flight'}</p>
          </div>
        </div>
        <PlatformBadge ticket={ticket} />
      </header>

      <ReviewNotice ticket={ticket} />
      {!journey && ticket.file_path ? (
        <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-xl bg-warning-bg px-3 py-2.5 text-[13px] text-warning">
          <span>Some details couldn’t be identified.</span>
          <button
            type="button"
            onClick={() => handlers.onRetry(ticket)}
            className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink shadow-soft"
          >
            Re-read with AI
          </button>
        </div>
      ) : null}

      {/* Route */}
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_minmax(64px,1.1fr)_minmax(0,1fr)] items-start gap-2 px-5">
        <Endpoint code={fromCode} city={fromCity} time={depTime} />
        <div className="flex flex-col items-center pt-3">
          <div className="flex w-full items-center gap-1.5 text-faint">
            <span className="size-1.5 shrink-0 rounded-full border border-current" />
            <span className="h-px flex-1 bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)] bg-[length:6px_1px]" />
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
              <Plane className="size-4 rotate-45" aria-hidden />
            </span>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)] bg-[length:6px_1px]" />
            <span className="size-1.5 shrink-0 rounded-full bg-current" />
          </div>
          <p className="mt-2 text-center text-[11px] font-medium text-muted">
            {stops.length ? `${stops.length} stop · ${stops.join(', ')}` : duration ?? (journey ? 'Direct' : '')}
          </p>
        </div>
        <Endpoint code={toCode} city={toCity} time={arrTime} align="right" shift={dayShift} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 px-5 text-xs">
        <span className="font-semibold tracking-[0.12em]">
          {depDate ? formatPass(depDate) : 'Date not provided'}
          {depDate ? <span className="ml-2 font-medium tracking-normal text-muted">{formatWeekday(depDate)}</span> : null}
        </span>
        {ticket.structured_data?.leg ? (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-semibold text-ink-2">
            {ticket.structured_data.leg === 'return' ? 'Return' : 'Outbound'}
          </span>
        ) : returnLeg ? (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-ink-2">
            Return {formatShort(returnLeg.departure.date)} · {returnLeg.departure.airport_code ?? ''}→{journey?.inbound.at(-1)?.arrival.airport_code ?? ''}
          </span>
        ) : null}
      </div>

      <Perforation className="mt-4" />

      <dl className="grid grid-cols-3 gap-x-4 gap-y-4 px-5 pb-2 pt-1">
        <Detail label="PNR" value={ticket.booking_reference} mono copy={ticket.booking_reference} className="col-span-2" />
        <Detail label="Seat" value={seat} mono />
        <Detail label="Class" value={cabin} />
        <Detail label="Terminal" value={terminal} />
        <Detail label="Flight" value={journey?.outbound.length === 1 ? flightNumbers : null} mono />
        <Detail label="Baggage" value={data?.baggage} />
      </dl>

      {journey && journey.outbound.length + journey.inbound.length > 1 ? (
        <ol className="mx-5 mt-3 space-y-1.5 rounded-2xl bg-surface-2/70 p-3 text-[13px]">
          {[...journey.outbound, ...journey.inbound].map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="truncate">
                <span className="font-mono font-semibold">{s.flight_number ?? '—'}</span>
                <span className="ml-2 text-muted">
                  {s.departure.airport_code ?? s.departure.city} {s.departure.time ?? ''} → {s.arrival.airport_code ?? s.arrival.city}{' '}
                  {s.arrival.time ?? ''}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted">{formatShort(s.departure.date)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </TicketShell>
  )
}

function Endpoint({
  code,
  city,
  time,
  align = 'left',
  shift,
}: {
  code: string | null
  city: string | null
  time: string | null
  align?: 'left' | 'right'
  shift?: string | null
}) {
  return (
    <div className={align === 'right' ? 'min-w-0 text-right' : 'min-w-0'}>
      <p className="text-[34px] font-semibold leading-none tracking-[-0.04em] sm:text-[38px]">{code ?? '—'}</p>
      <p className="mt-1.5 truncate text-[13px] text-muted">{city ?? 'Not provided'}</p>
      {time ? (
        <p className="mt-2 font-mono text-lg font-semibold tabular">
          {time}
          {shift ? <sup className="ml-0.5 text-[10px] font-medium text-muted">{shift}</sup> : null}
        </p>
      ) : null}
    </div>
  )
}
