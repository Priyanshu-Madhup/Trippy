import { motion } from 'framer-motion'
import { CircleAlert, ExternalLink, RotateCw, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import type { TicketHandlers } from './parts'
import { isStale } from '@/utils/ticket'
import type { Ticket } from '@/types'

/** "Couldn't read this document." — with Retry / Open original. */
export function FailedTicketCard({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-[26px] border border-danger/20 bg-surface p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger-bg text-danger">
          <CircleAlert className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold">Couldn’t read this document.</h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">{ticket.file_name}</p>
          {ticket.error_message && ticket.error_message !== 'Couldn\'t read this document.' ? (
            <p className="mt-2 text-[13px] text-muted">{ticket.error_message}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {ticket.file_path ? (
          <Button size="sm" onClick={() => handlers.onRetry(ticket)}>
            <RotateCw aria-hidden /> Retry
          </Button>
        ) : null}
        {ticket.file_path ? (
          <Button size="sm" variant="secondary" onClick={() => handlers.onOpen(ticket)}>
            <ExternalLink aria-hidden /> Open original
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => handlers.onDelete(ticket)} className="text-danger hover:bg-danger-bg hover:text-danger">
          <Trash2 aria-hidden /> Delete
        </Button>
      </div>
    </motion.article>
  )
}

/** A ticket processing elsewhere (another tab/device) or interrupted. */
export function PendingTicketCard({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  const stale = isStale(ticket)
  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-[26px] border border-line bg-surface p-5 shadow-card"
      role="status"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-surface-2">
          <Sparkles className={stale ? 'size-5 text-muted' : 'size-5 animate-pulse-soft'} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{stale ? 'This is taking longer than expected' : 'Reading your ticket…'}</p>
          <p className="truncate text-[13px] text-muted">{ticket.file_name}</p>
        </div>
      </div>
      {stale ? (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => handlers.onRetry(ticket)}>
            <RotateCw aria-hidden /> Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handlers.onDelete(ticket)}>
            Remove
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      )}
    </motion.article>
  )
}

export function TicketCardSkeleton() {
  return (
    <div className="rounded-[26px] border border-line bg-surface p-5 shadow-card" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="mt-7 flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="mb-3 h-px w-20" />
        <div className="flex flex-col items-end space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-7 grid grid-cols-3 gap-4">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    </div>
  )
}
