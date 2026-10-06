import { ProviderLogo } from '@/components/common/ProviderLogo'
import { Detail, Perforation, PlatformBadge, ReviewNotice, TicketShell, type TicketHandlers } from './parts'
import { durationLabel, formatPass, formatWeekday } from '@/utils/date'
import { detailsOf, TYPE_META } from '@/utils/ticket'
import { cn } from '@/lib/utils'
import type { BusData, Ticket, TrainData } from '@/types'

/** Shared layout for ground transport. */
function TransitCard({
  ticket,
  handlers,
  kind,
  data,
}: {
  ticket: Ticket
  handlers: TicketHandlers
  kind: 'train' | 'bus'
  data: TrainData | BusData | null
}) {
  const meta = TYPE_META[kind]
  const Icon = meta.icon
  const train = kind === 'train' ? (data as TrainData | null) : null
  const bus = kind === 'bus' ? (data as BusData | null) : null

  const operator = ticket.provider_name ?? data?.operator.name ?? null
  const service = train ? [train.train_name, train.train_number].filter(Boolean).join(' · ') : (bus?.bus_type ?? null)
  const from = ticket.origin ?? data?.departure.city ?? data?.departure.station ?? null
  const to = ticket.destination ?? data?.arrival.city ?? data?.arrival.station ?? null
  const depTime = ticket.start_time ?? data?.departure.time ?? null
  const arrTime = ticket.end_time ?? data?.arrival.time ?? null
  const depDate = ticket.travel_date ?? data?.departure.date ?? null
  const arrDate = ticket.end_date ?? data?.arrival.date ?? null
  const duration = durationLabel(depDate, depTime, arrDate, arrTime)
  const overnight = depDate && arrDate && arrDate > depDate

  return (
    <TicketShell ticket={ticket} handlers={handlers}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          {ticket.provider_logo_url ? (
            <ProviderLogo src={ticket.provider_logo_url} name={operator} size={44} />
          ) : (
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', meta.tone)}>
              <Icon className="size-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{operator ?? meta.label}</p>
            <p className="truncate text-[13px] text-muted">{service || meta.label}</p>
          </div>
        </div>
        <PlatformBadge ticket={ticket} />
      </header>

      <ReviewNotice ticket={ticket} />

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 px-5">
        <div className="min-w-0">
          <p className="truncate text-[22px] font-semibold leading-tight tracking-[-0.025em]">{from ?? '—'}</p>
          <p className="mt-1 truncate text-[13px] text-muted">{data?.departure.station ?? ' '}</p>
          {depTime ? <p className="mt-2 font-mono text-lg font-semibold tabular">{depTime}</p> : null}
        </div>
        <div className="flex flex-col items-center pt-1.5 text-faint">
          <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-ink">
            <Icon className="size-4" aria-hidden />
          </span>
          {duration ? <span className="mt-1.5 whitespace-nowrap text-[11px] font-medium text-muted">{duration}</span> : null}
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-[22px] font-semibold leading-tight tracking-[-0.025em]">{to ?? '—'}</p>
          <p className="mt-1 truncate text-[13px] text-muted">{data?.arrival.station ?? ' '}</p>
          {arrTime ? (
            <p className="mt-2 font-mono text-lg font-semibold tabular">
              {arrTime}
              {overnight ? <sup className="ml-0.5 text-[10px] font-medium text-muted">+1</sup> : null}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-5 px-5 text-xs font-semibold tracking-[0.12em]">
        {depDate ? formatPass(depDate) : 'Date not provided'}
        {depDate ? <span className="ml-2 font-medium tracking-normal text-muted">{formatWeekday(depDate)}</span> : null}
      </p>

      <Perforation className="mt-4" />

      <dl className="grid grid-cols-3 gap-x-4 gap-y-4 px-5 pb-1 pt-1">
        <Detail
          label={kind === 'train' ? 'PNR' : 'Ticket'}
          value={ticket.booking_reference}
          mono
          copy={ticket.booking_reference}
          className="col-span-2"
        />
        <Detail label="Seat" value={data?.seat} mono />
        {train ? (
          <>
            <Detail label="Coach" value={train.coach} mono />
            <Detail label="Berth" value={train.berth} />
            <Detail label="Class" value={train.travel_class} />
          </>
        ) : null}
        {bus ? <Detail label="Boarding" value={bus.departure.station} className="col-span-3" /> : null}
      </dl>
    </TicketShell>
  )
}

export function TrainCard({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  return <TransitCard ticket={ticket} handlers={handlers} kind="train" data={detailsOf(ticket, 'train')} />
}

export function BusCard({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  return <TransitCard ticket={ticket} handlers={handlers} kind="bus" data={detailsOf(ticket, 'bus')} />
}
