import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowRight, ChevronUp, Copy, Download, Ellipsis, Info, Pencil, RotateCw, Trash2, type LucideIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ProviderLogo } from '@/components/common/ProviderLogo'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/types'

export interface TicketHandlers {
  onOpen: (ticket: Ticket) => void
  onEdit: (ticket: Ticket) => void
  onDelete: (ticket: Ticket) => void
  onRetry: (ticket: Ticket) => void
  onDownload?: (ticket: Ticket) => void
  /** When set, the card shows a "collapse" control (used by the expandable list). */
  onCollapse?: (ticket: Ticket) => void
}

/** Label / value pair. Renders nothing when the value is missing — we never show invented data. */
export function Detail({
  label,
  value,
  mono,
  copy,
  className,
}: {
  label: string
  value: ReactNode | null | undefined
  mono?: boolean
  copy?: string | null
  className?: string
}) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-faint">{label}</dt>
      <dd className={cn('mt-1 flex items-center gap-1.5 truncate text-[15px] font-semibold', mono && 'font-mono text-[14px] tracking-wide')}>
        <span className="truncate">{value}</span>
        {copy ? <CopyButton value={copy} label={label} /> : null}
      </dd>
    </div>
  )
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void navigator.clipboard
          ?.writeText(value)
          .then(() => toast.success(`${label} copied`))
          .catch(() => toast.error('Couldn’t copy'))
      }}
      className="grid size-6 shrink-0 place-items-center rounded-md text-faint transition hover:bg-surface-2 hover:text-ink"
      aria-label={`Copy ${label}`}
    >
      <Copy className="size-3.5" />
    </button>
  )
}

/** Dotted tear line with notches, boarding-pass style. */
export function Perforation({ className }: { className?: string }) {
  return (
    <div className={cn('relative my-1 h-6', className)} aria-hidden>
      <span className="absolute -left-3 top-0 size-6 rounded-full border border-line bg-bg" />
      <span className="absolute -right-3 top-0 size-6 rounded-full border border-line bg-bg" />
      <span className="perforation absolute inset-x-5 top-1/2" />
    </div>
  )
}

export function PlatformBadge({ ticket, tone = 'default' }: { ticket: Ticket; tone?: 'default' | 'glass' }) {
  if (!ticket.booking_platform) return null
  return (
    <span
      className={cn(
        'inline-flex max-w-[150px] items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs font-medium',
        tone === 'glass' ? 'bg-white/90 text-[#111] shadow-soft backdrop-blur' : 'bg-surface-2 text-ink-2',
      )}
      title={`Booked via ${ticket.booking_platform}`}
    >
      <ProviderLogo src={ticket.booking_platform_logo_url} name={ticket.booking_platform} size={20} rounded="rounded-full" />
      <span className="truncate">{ticket.booking_platform}</span>
    </span>
  )
}

export function ReviewNotice({ ticket }: { ticket: Ticket }) {
  if (!ticket.needs_review) return null
  return (
    <p className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-warning-bg px-3 py-2 text-[13px] text-warning">
      <Info className="size-4 shrink-0" aria-hidden />
      Please verify these details.
    </p>
  )
}

/** Common card frame: actions, notes and the "Open ticket" footer. */
export function TicketShell({
  ticket,
  handlers,
  children,
  accent,
  openLabel = 'Open ticket',
  className,
}: {
  ticket: Ticket
  handlers: TicketHandlers
  children: ReactNode
  accent?: string
  openLabel?: string
  className?: string
}) {
  const hasFile = !!ticket.file_path
  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={cn('relative overflow-hidden rounded-[26px] border border-line bg-surface shadow-card', className)}
      aria-label={ticket.title ?? ticket.file_name ?? 'Ticket'}
    >
      {accent ? <div className="h-1 w-full" style={{ background: accent }} aria-hidden /> : null}
      {children}

      {ticket.notes ? (
        <p className="mx-5 mb-1 mt-3 whitespace-pre-line rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
          {ticket.notes}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={() => handlers.onOpen(ticket)}
          disabled={!hasFile}
          title={hasFile ? undefined : 'Sample ticket — there is no original file'}
          className="group inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition hover:bg-surface-2 disabled:cursor-default disabled:text-faint disabled:hover:bg-transparent"
        >
          {openLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>
        <div className="flex items-center gap-0.5">
          {handlers.onCollapse ? (
            <button
              type="button"
              onClick={() => handlers.onCollapse?.(ticket)}
              className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
              aria-label="Collapse ticket"
            >
              <ChevronUp className="size-[18px]" />
            </button>
          ) : null}
          <TicketMenu ticket={ticket} handlers={handlers} />
        </div>
      </div>
    </motion.article>
  )
}

export function TicketMenu({ ticket, handlers }: { ticket: Ticket; handlers: TicketHandlers }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="grid size-10 place-items-center rounded-full text-muted outline-none transition hover:bg-surface-2 hover:text-ink focus-visible:ring-4 focus-visible:ring-ring/25"
        aria-label="Ticket actions"
      >
        <Ellipsis className="size-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem icon={<Pencil />} onSelect={() => handlers.onEdit(ticket)}>
          Edit details
        </DropdownMenuItem>
        {ticket.file_path && handlers.onDownload ? (
          <DropdownMenuItem icon={<Download />} onSelect={() => handlers.onDownload?.(ticket)}>
            Download original
          </DropdownMenuItem>
        ) : null}
        {ticket.file_path ? (
          <DropdownMenuItem icon={<RotateCw />} onSelect={() => handlers.onRetry(ticket)}>
            Re-read with AI
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<Trash2 />} destructive onSelect={() => handlers.onDelete(ticket)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TypePill({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', tone)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}
