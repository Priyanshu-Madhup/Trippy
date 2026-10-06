import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Download, ExternalLink, FileWarning, Minus, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/misc'
import { useFileUrl } from '@/hooks/useTickets'
import { getTicketFileUrl } from '@/services/tickets'
import type { Ticket } from '@/types'

export async function downloadTicket(ticket: Ticket) {
  if (!ticket.file_path) return
  try {
    const url = await getTicketFileUrl(ticket.file_path, { download: ticket.file_name ?? 'ticket' })
    const a = document.createElement('a')
    a.href = url
    a.download = ticket.file_name ?? 'ticket'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Download failed.')
  }
}

const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3]

/** Full-screen viewer for the original PDF / image, with zoom, open and download. */
export function TicketViewer({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const open = !!ticket
  const { data: url, isLoading, error } = useFileUrl(ticket?.file_path, open)
  const [zoomIndex, setZoomIndex] = useState(2)
  const zoom = ZOOMS[zoomIndex]
  const isPdf = ticket?.file_type === 'pdf' || ticket?.mime_type === 'application/pdf'

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose()
          setZoomIndex(2)
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col outline-none sm:inset-6 sm:overflow-hidden sm:rounded-[28px] sm:bg-[#111]">
          <div className="pt-safe flex items-center gap-2 bg-[#111]/90 px-3 py-2.5 text-white backdrop-blur sm:px-4">
            <div className="min-w-0 flex-1 pl-1">
              <DialogPrimitive.Title className="truncate text-sm font-semibold">{ticket?.title ?? ticket?.file_name ?? 'Document'}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="truncate text-xs text-white/55">{ticket?.file_name}</DialogPrimitive.Description>
            </div>
            {!isPdf ? (
              <div className="hidden items-center rounded-full bg-white/10 p-0.5 sm:flex">
                <button
                  className="grid size-8 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40"
                  onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
                  disabled={zoomIndex === 0}
                  aria-label="Zoom out"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-12 text-center font-mono text-xs tabular" aria-live="polite">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  className="grid size-8 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40"
                  onClick={() => setZoomIndex((i) => Math.min(ZOOMS.length - 1, i + 1))}
                  disabled={zoomIndex === ZOOMS.length - 1}
                  aria-label="Zoom in"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            ) : null}
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-10 place-items-center rounded-full hover:bg-white/10"
                aria-label="Open original in a new tab"
              >
                <ExternalLink className="size-[18px]" />
              </a>
            ) : null}
            <button
              onClick={() => ticket && void downloadTicket(ticket)}
              className="grid size-10 place-items-center rounded-full hover:bg-white/10"
              aria-label="Download"
            >
              <Download className="size-[18px]" />
            </button>
            <DialogPrimitive.Close className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
              <X className="size-[18px]" />
            </DialogPrimitive.Close>
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto bg-[#1a1a1a] overscroll-contain">
            {isLoading ? (
              <div className="grid h-full place-items-center p-8">
                <Skeleton className="h-[70%] w-[min(90%,560px)] rounded-2xl opacity-20" />
              </div>
            ) : error || !url ? (
              <div className="grid h-full place-items-center p-8 text-center text-white">
                <div>
                  <FileWarning className="mx-auto size-10 text-white/50" />
                  <p className="mt-3 font-semibold">This file couldn’t be opened.</p>
                  <p className="mt-1 text-sm text-white/60">{error instanceof Error ? error.message : 'Please try again.'}</p>
                </div>
              </div>
            ) : isPdf ? (
              <>
                <iframe src={url} title={ticket?.file_name ?? 'PDF'} className="size-full bg-white" />
                {/* Mobile browsers often show only the first PDF page inline. */}
                <div className="pb-safe pointer-events-none absolute inset-x-0 bottom-4 flex justify-center sm:hidden">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#111] shadow-float"
                  >
                    <ExternalLink className="size-4" aria-hidden /> Open full PDF
                  </a>
                </div>
              </>
            ) : (
              <div
                className="flex min-h-full min-w-full items-start justify-center p-4 sm:items-center sm:p-8"
                onDoubleClick={() => setZoomIndex((i) => (ZOOMS[i] >= 2 ? 2 : 4))}
              >
                <img
                  src={url}
                  alt={ticket?.title ?? 'Ticket'}
                  className="h-auto max-w-none rounded-lg shadow-2xl transition-[width] duration-200"
                  style={{ width: `${Math.round(zoom * 100)}%`, maxWidth: zoom <= 1 ? '100%' : undefined }}
                  draggable={false}
                />
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
