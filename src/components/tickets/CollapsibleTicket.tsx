import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { ProviderLogo } from '@/components/common/ProviderLogo'
import { TicketCard, type TicketHandlers } from './TicketCard'
import { cn } from '@/lib/utils'
import { formatShort, formatWeekday } from '@/utils/date'
import { detailsOf, flightJourney, ticketView } from '@/utils/ticket'
import type { Ticket } from '@/types'

/**
 * Compact ticket that expands downward into the full card. The outer box
 * animates its height to whatever the current content measures, so opening
 * and closing feels like the card grows / folds from the top.
 */
export function CollapsibleTicket({
  ticket,
  handlers,
  expanded,
  onToggle,
  index,
}: {
  ticket: Ticket
  handlers: TicketHandlers
  expanded: boolean
  onToggle: (id: string, open: boolean) => void
  index: number
}) {
  // Failed / still-processing tickets are already compact and actionable.
  const collapsible = ticket.processing_status === 'completed'

  return (
    <motion.div
      id={`ticket-${ticket.id}`}
      layout="position"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-24 rounded-[26px]"
    >
      {collapsible ? (
        <AutoHeight>
          <AnimatePresence mode="popLayout" initial={false}>
            {expanded ? (
              <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <TicketCard ticket={ticket} handlers={{ ...handlers, onCollapse: () => onToggle(ticket.id, false) }} />
              </motion.div>
            ) : (
              <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <CompactTicket ticket={ticket} onClick={() => onToggle(ticket.id, true)} />
              </motion.div>
            )}
          </AnimatePresence>
        </AutoHeight>
      ) : (
        <TicketCard ticket={ticket} handlers={handlers} />
      )}
    </motion.div>
  )
}

/** Animates its height to match its children whenever they resize. */
function AutoHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')

  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const update = () => setHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <motion.div
      className="overflow-hidden rounded-[26px]"
      initial={false}
      animate={{ height }}
      transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
    >
      <div ref={inner}>{children}</div>
    </motion.div>
  )
}

/** Minimal summary: logo, title, key reference and when. */
function CompactTicket({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const view = ticketView(ticket)
  const Icon = view.meta.icon
  const journey = ticket.document_type === 'flight' ? flightJourney(detailsOf(ticket, 'flight')) : null
  const codes =
    journey?.first.departure.airport_code && journey.last.arrival.airport_code
      ? `${journey.first.departure.airport_code} → ${journey.last.arrival.airport_code}`
      : null
  const title = codes ?? view.title
  const leg = ticket.structured_data?.leg
  const meta = [
    leg === 'return' ? 'Return' : leg === 'outbound' ? 'Outbound' : null,
    codes ? view.title : view.meta.label,
    view.provider && view.provider !== view.title ? view.provider : null,
  ]
    .filter(Boolean)
    .join(' · ')

  let logo: ReactNode
  if (ticket.document_type === 'flight') {
    logo = <ProviderLogo src={ticket.airline_logo_url} name={ticket.airline_name ?? ticket.provider_name} code={ticket.airline_code} size={44} />
  } else if (ticket.image_url && (ticket.document_type === 'hotel' || ticket.document_type === 'activity')) {
    logo = <img src={ticket.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-11 shrink-0 rounded-xl object-cover" />
  } else if (ticket.provider_logo_url) {
    logo = <ProviderLogo src={ticket.provider_logo_url} name={ticket.provider_name} size={44} />
  } else {
    logo = (
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', view.meta.tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={false}
      className="group flex w-full items-center gap-3.5 rounded-[26px] border border-line bg-surface p-3.5 pr-3 text-left shadow-soft transition hover:shadow-card active:scale-[0.995]"
    >
      <span className="relative shrink-0">
        {logo}
        {ticket.booking_platform_logo_url ? (
          <span className="absolute -bottom-1 -right-1">
            <ProviderLogo src={ticket.booking_platform_logo_url} name={ticket.booking_platform} size={20} rounded="rounded-full" className="ring-2 ring-surface" />
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold tracking-tight">{title}</span>
          {ticket.needs_review ? <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-label="Needs a check" /> : null}
        </span>
        <span className="block truncate text-[13px] text-muted">
          {meta}
          {view.reference ? <span className="font-mono text-[12px] tracking-wide"> · {view.reference}</span> : null}
        </span>
      </span>
      {view.date ? (
        <span className="shrink-0 text-right">
          <span className="block text-[13px] font-semibold">{formatShort(view.date)}</span>
          <span className="block font-mono text-xs text-muted tabular">{view.time ?? formatWeekday(view.date)}</span>
        </span>
      ) : null}
      <ChevronDown className="size-5 shrink-0 text-faint transition-transform group-hover:translate-y-0.5 group-hover:text-ink" aria-hidden />
    </button>
  )
}
