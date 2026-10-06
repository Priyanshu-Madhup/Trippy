import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Download, ExternalLink, FileWarning, LoaderCircle, Minus, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/misc'
import { useFileUrl } from '@/hooks/useTickets'
import { useBackToClose } from '@/hooks/useBackToClose'
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
const DEFAULT_ZOOM = 2

/**
 * Full-screen viewer for the original file. PDFs are rendered in-app with
 * pdf.js (phone browsers can't show PDFs inline), images are shown directly.
 * Zoom, open original and download are available for both; the phone back
 * button closes the viewer.
 */
export function TicketViewer({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const open = !!ticket
  const { data: url, isLoading, error } = useFileUrl(ticket?.file_path, open)
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM)
  const zoom = ZOOMS[zoomIndex]
  const isPdf = ticket?.file_type === 'pdf' || ticket?.mime_type === 'application/pdf'

  useBackToClose(open, onClose)
  useEffect(() => {
    if (!open) setZoomIndex(DEFAULT_ZOOM)
  }, [open])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col outline-none sm:inset-6 sm:overflow-hidden sm:rounded-[28px] sm:bg-[#111]">
          <div className="pt-safe flex items-center gap-1.5 bg-[#111]/95 px-2 py-2 text-white backdrop-blur sm:px-4">
            <DialogPrimitive.Close className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
              <X className="size-[18px]" />
            </DialogPrimitive.Close>
            <div className="min-w-0 flex-1 pl-1.5">
              <DialogPrimitive.Title className="truncate text-sm font-semibold">{ticket?.title ?? ticket?.file_name ?? 'Document'}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="truncate text-xs text-white/55">{ticket?.file_name}</DialogPrimitive.Description>
            </div>
            <div className="flex items-center rounded-full bg-white/10 p-0.5">
              <button
                className="grid size-8 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40"
                onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
                disabled={zoomIndex === 0}
                aria-label="Zoom out"
              >
                <Minus className="size-4" />
              </button>
              <span className="hidden w-11 text-center font-mono text-xs tabular sm:inline" aria-live="polite">
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
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden size-10 place-items-center rounded-full hover:bg-white/10 sm:grid"
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
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-[#1a1a1a]">
            {isLoading ? (
              <div className="grid h-full place-items-center p-8">
                <Skeleton className="h-[70%] w-[min(90%,560px)] rounded-2xl opacity-20" />
              </div>
            ) : error || !url ? (
              <ViewerError message={error instanceof Error ? error.message : 'Please try again.'} />
            ) : (
              <div
                className="mx-auto px-3 py-4 sm:px-8 sm:py-8"
                style={{ width: `${Math.round(zoom * 100)}%`, maxWidth: zoom <= 1 ? 900 : undefined, minWidth: zoom > 1 ? undefined : 0 }}
                onDoubleClick={() => setZoomIndex((i) => (ZOOMS[i] >= 1.5 ? DEFAULT_ZOOM : 4))}
              >
                {isPdf ? <PdfPages url={url} /> : <img src={url} alt={ticket?.title ?? 'Ticket'} className="w-full rounded-lg shadow-2xl" draggable={false} />}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Renders each PDF page with pdf.js and shows them as they finish. */
function PdfPages({ url }: { url: string }) {
  const [pages, setPages] = useState<string[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const signal = { cancelled: false }
    const created: string[] = []
    setPages([])
    setTotal(null)
    setFailed(false)
    ;(async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(String(res.status))
        const blob = await res.blob()
        const { renderPdfForViewing } = await import('@/utils/pdf')
        // Sharp on high-DPI phones without blowing up memory.
        const width = Math.min(2000, Math.max(1000, Math.round(Math.min(window.innerWidth, 900) * (window.devicePixelRatio || 1) * 1.5)))
        await renderPdfForViewing(blob, {
          width,
          signal,
          onPage: (pageUrl, _i, count) => {
            created.push(pageUrl)
            setTotal(count)
            setPages((p) => [...p, pageUrl])
          },
        })
      } catch {
        if (!signal.cancelled) setFailed(true)
      }
    })()
    return () => {
      signal.cancelled = true
      created.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [url])

  if (failed) return <ViewerError message="This PDF couldn’t be displayed." href={url} />

  return (
    <div className="space-y-3 sm:space-y-4">
      {pages.map((src, i) => (
        <img key={src} src={src} alt={`Page ${i + 1}`} className="w-full rounded-md bg-white shadow-2xl" draggable={false} />
      ))}
      {total === null || pages.length < total ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/60" role="status">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          {total ? `Loading page ${pages.length + 1} of ${total}…` : 'Opening PDF…'}
        </div>
      ) : (
        <p className="pb-2 text-center text-xs text-white/40">{total === 1 ? '1 page' : `${total} pages`}</p>
      )}
    </div>
  )
}

function ViewerError({ message, href }: { message: string; href?: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center p-8 text-center text-white">
      <div>
        <FileWarning className="mx-auto size-10 text-white/50" />
        <p className="mt-3 font-semibold">This file couldn’t be opened.</p>
        <p className="mt-1 text-sm text-white/60">{message}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#111]">
            <ExternalLink className="size-4" /> Open original
          </a>
        ) : null}
      </div>
    </div>
  )
}
