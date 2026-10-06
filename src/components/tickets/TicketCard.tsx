import { FlightCard } from './FlightCard'
import { HotelCard } from './HotelCard'
import { BusCard, TrainCard } from './TransitCard'
import { ReservationCard } from './ReservationCard'
import { GenericDocumentCard } from './GenericDocumentCard'
import { FailedTicketCard, PendingTicketCard } from './StatusCards'
import type { TicketHandlers } from './parts'
import type { Ticket } from '@/types'

/** Picks the right card for a ticket's status and document type. */
export function TicketCard({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  if (ticket.processing_status === 'failed') return <FailedTicketCard ticket={ticket} handlers={handlers} />
  if (ticket.processing_status !== 'completed') return <PendingTicketCard ticket={ticket} handlers={handlers} />

  switch (ticket.document_type) {
    case 'flight':
      return <FlightCard ticket={ticket} handlers={handlers} />
    case 'hotel':
      return <HotelCard ticket={ticket} handlers={handlers} />
    case 'train':
      return <TrainCard ticket={ticket} handlers={handlers} />
    case 'bus':
      return <BusCard ticket={ticket} handlers={handlers} />
    case 'restaurant':
    case 'activity':
      return <ReservationCard ticket={ticket} handlers={handlers} />
    default:
      return <GenericDocumentCard ticket={ticket} handlers={handlers} />
  }
}

export type { TicketHandlers }
