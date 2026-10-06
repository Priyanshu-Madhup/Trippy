import { FileText, ImageIcon } from 'lucide-react'
import { Detail, ReviewNotice, TicketShell, type TicketHandlers } from './parts'
import { formatLong, formatUploaded } from '@/utils/date'
import { detailsOf } from '@/utils/ticket'
import type { GenericData, Ticket } from '@/types'

/** Fallback card — classification failing never means losing the document. */
export function GenericDocumentCard({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  const data: GenericData | null = detailsOf(ticket, 'generic_travel_document') ?? detailsOf(ticket, 'unknown')
  const title = ticket.title ?? ticket.file_name ?? 'Document'
  const FileIcon = ticket.file_type === 'image' ? ImageIcon : FileText
  const facts = (data?.key_facts ?? []).map((f) => ({
    ...f,
    value: /^\d{4}-\d{2}-\d{2}$/.test(f.value) ? formatLong(f.value) : f.value,
  }))

  return (
    <TicketShell ticket={ticket} handlers={handlers} openLabel="Open document">
      <header className="flex items-start gap-3 px-5 pt-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
          <FileIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">Document{ticket.provider_name ? ` · ${ticket.provider_name}` : ''}</p>
          <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-faint">
            {[ticket.file_name && ticket.file_name !== title ? ticket.file_name : null, `Uploaded ${formatUploaded(ticket.created_at)}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </header>

      <ReviewNotice ticket={ticket} />

      {ticket.summary ? <p className="px-5 pt-4 text-[14px] leading-relaxed text-ink-2">{ticket.summary}</p> : null}

      {facts.length ? (
        <dl className="mx-5 mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-surface-2/70 p-4">
          {facts.map((f, i) => (
            <Detail key={`${f.label}-${i}`} label={f.label} value={f.value} />
          ))}
        </dl>
      ) : null}
      {!ticket.summary && !facts.length ? (
        <p className="px-5 pt-4 text-sm text-muted">Some details couldn’t be identified. You can add them with “Edit details”.</p>
      ) : null}
    </TicketShell>
  )
}
