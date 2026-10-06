import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { LogOut as CheckoutIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatShort, formatWeekday } from '@/utils/date'
import { chronoKey, ticketView, TYPE_META } from '@/utils/ticket'
import type { Ticket } from '@/types'

interface TimelineEvent {
  key: string
  ticket: Ticket
  date: string | null
  time: string | null
  label: string
  title: string
  detail: string | null
  checkout?: boolean
}

function buildEvents(tickets: Ticket[]): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (const t of [...tickets].sort((a, b) => chronoKey(a).localeCompare(chronoKey(b)))) {
    if (t.processing_status !== 'completed') continue
    const view = ticketView(t)
    const route = t.origin && t.destination ? `${t.origin} → ${t.destination}` : null
    const times = t.start_time && t.end_time && t.document_type !== 'hotel' ? `${t.start_time} → ${t.end_time}` : t.start_time

    let detail: string | null
    switch (t.document_type) {
      case 'flight':
      case 'train':
      case 'bus':
        detail = [view.provider, times].filter(Boolean).join(' · ') || null
        break
      case 'hotel':
        detail = [t.destination, t.start_time ? `Check-in ${t.start_time}` : null].filter(Boolean).join(' · ') || null
        break
      default:
        detail = [t.destination, times].filter(Boolean).join(' · ') || null
    }

    events.push({
      key: t.id,
      ticket: t,
      date: t.travel_date,
      time: t.start_time,
      label: view.meta.label,
      title: t.document_type === 'flight' || t.document_type === 'train' || t.document_type === 'bus' ? (route ?? view.title) : view.title,
      detail,
    })

    if (t.document_type === 'hotel' && t.end_date && t.end_date !== t.travel_date) {
      events.push({
        key: `${t.id}-out`,
        ticket: t,
        date: t.end_date,
        time: t.end_time ?? '23:59',
        label: 'Check-out',
        title: view.title,
        detail: t.end_time ? `Check-out ${t.end_time}` : null,
        checkout: true,
      })
    }
  }
  return events.sort((a, b) => `${a.date ?? '9999'}${a.time ?? '99'}`.localeCompare(`${b.date ?? '9999'}${b.time ?? '99'}`))
}

export function scrollToTicket(id: string) {
  const el = document.getElementById(`ticket-${id}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.animate(
    [{ boxShadow: '0 0 0 0 rgb(232 178 106 / 0)' }, { boxShadow: '0 0 0 6px rgb(232 178 106 / 0.55)' }, { boxShadow: '0 0 0 0 rgb(232 178 106 / 0)' }],
    { duration: 1400, easing: 'ease-out', delay: 350 },
  )
}

/** Vertical itinerary grouped by day. Tapping an event jumps to its ticket card. */
export function TripTimeline({ tickets, className }: { tickets: Ticket[]; className?: string }) {
  const groups = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>()
    for (const e of buildEvents(tickets)) {
      const k = e.date ?? 'undated'
      map.set(k, [...(map.get(k) ?? []), e])
    }
    return [...map.entries()]
  }, [tickets])

  if (groups.length === 0) return null

  return (
    <ol className={cn('relative', className)} aria-label="Itinerary">
      {groups.map(([date, events], gi) => (
        <li key={date} className="relative pb-2">
          <div className="sticky top-0 z-10 -mx-1 flex items-baseline gap-2 bg-bg/90 px-1 py-2 backdrop-blur-md">
            <span className="text-[13px] font-semibold uppercase tracking-[0.08em]">
              {date === 'undated' ? 'Anytime' : formatShort(date)}
            </span>
            {date !== 'undated' ? <span className="text-xs text-muted">{formatWeekday(date)}</span> : null}
          </div>
          <ol className="relative ml-[19px] border-l border-dashed border-line-strong pb-3 pl-7">
            {events.map((e, i) => {
              const meta = TYPE_META[e.ticket.document_type]
              const Icon = e.checkout ? CheckoutIcon : meta.icon
              return (
                <motion.li
                  key={e.key}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.3, delay: Math.min(i, 4) * 0.04 + (gi === 0 ? 0.05 : 0) }}
                  className="relative py-2"
                >
                  <span className="absolute -left-[48px] top-2.5 size-10 rounded-full bg-surface ring-4 ring-bg">
                    <span className={cn('grid size-full place-items-center rounded-full', e.checkout ? 'bg-surface-2 text-muted' : meta.tone)}>
                      <Icon className="size-[17px]" aria-hidden />
                    </span>
                  </span>
                  <button
                    onClick={() => scrollToTicket(e.ticket.id)}
                    className="group w-full rounded-2xl px-3 py-2 text-left transition hover:bg-surface"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-muted">{e.label}</span>
                      {e.time && !e.checkout ? <span className="font-mono text-xs text-muted tabular">{e.time}</span> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[15px] font-semibold">{e.title}</span>
                    {e.detail ? <span className="mt-0.5 block truncate text-[13px] text-muted">{e.detail}</span> : null}
                  </button>
                </motion.li>
              )
            })}
          </ol>
        </li>
      ))}
    </ol>
  )
}
