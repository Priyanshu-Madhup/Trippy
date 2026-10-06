import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/misc'
import { DestinationImage } from '@/components/common/DestinationImage'
import { UploadDropzone } from './UploadDropzone'
import { useTrips } from '@/hooks/useTrips'
import { useUploads } from '@/hooks/useUpload'
import { useStartTripFromFiles } from '@/hooks/useAutoTrip'
import { formatRange, todayISO } from '@/utils/date'
import { cn } from '@/lib/utils'

/**
 * Upload from anywhere. Defaults to "New trip": no typing at all — the trip's
 * name, destination, dates and cover are filled in from the ticket.
 */
const NEW = '__new__'

export function QuickUploadDialog({
  open,
  onOpenChange,
  tripId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId?: string
}) {
  const navigate = useNavigate()
  const { data: trips, isLoading } = useTrips()
  const { enqueue } = useUploads()
  const autoTrip = useStartTripFromFiles()

  const sorted = useMemo(() => {
    const today = todayISO()
    return [...(trips ?? [])].sort((a, b) => {
      const ua = (a.end_date ?? a.start_date ?? '9999') >= today ? 0 : 1
      const ub = (b.end_date ?? b.start_date ?? '9999') >= today ? 0 : 1
      if (ua !== ub) return ua - ub
      return (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999')
    })
  }, [trips])

  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => {
    if (open) setSelected(tripId ?? NEW)
  }, [open, tripId])

  function onFiles(files: File[]) {
    if (!selected) return
    if (selected === NEW) {
      onOpenChange(false)
      void autoTrip.start(files)
      return
    }
    enqueue(selected, files)
    onOpenChange(false)
    navigate(`/app/trip/${selected}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Upload a ticket" description="Drop a booking confirmation — we’ll create and fill in the trip for you.">
        <div className="space-y-5 px-6 pb-6 pt-5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          ) : (
            <>
              <div role="radiogroup" aria-label="Trip" className="no-scrollbar -mx-6 flex snap-x gap-2.5 overflow-x-auto px-6 pb-1">
                <button
                  role="radio"
                  aria-checked={selected === NEW}
                  onClick={() => setSelected(NEW)}
                  className={cn(
                    'relative w-40 shrink-0 snap-start overflow-hidden rounded-2xl text-left ring-2 transition',
                    selected === NEW ? 'ring-ink' : 'ring-transparent hover:ring-line-strong',
                  )}
                >
                  <span className="relative flex h-20 flex-col justify-end bg-[linear-gradient(135deg,#1d2747,#6b4a7a_55%,#e8a87c)] p-3 text-white">
                    <Sparkles className="absolute left-3 top-3 size-4 text-[#F3C88F]" aria-hidden />
                    {selected === NEW ? (
                      <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-white text-[#111]">
                        <Check className="size-3.5" />
                      </span>
                    ) : null}
                    <span className="text-sm font-semibold">New trip</span>
                  </span>
                  <span className="block truncate bg-surface-2 px-3 py-1.5 text-xs text-muted">Named from your ticket</span>
                </button>
                {sorted.map((trip) => {
                  const active = trip.id === selected
                  return (
                    <button
                      key={trip.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelected(trip.id)}
                      className={cn(
                        'relative w-40 shrink-0 snap-start overflow-hidden rounded-2xl text-left ring-2 transition',
                        active ? 'ring-ink' : 'ring-transparent hover:ring-line-strong',
                      )}
                    >
                      <DestinationImage src={trip.cover_image_url} seed={trip.destination ?? trip.name} alt="" className="h-20">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        {active ? (
                          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-white text-[#111]">
                            <Check className="size-3.5" />
                          </span>
                        ) : null}
                        <span className="absolute inset-x-3 bottom-2 truncate text-sm font-semibold text-white">{trip.name}</span>
                      </DestinationImage>
                      <span className="block truncate bg-surface-2 px-3 py-1.5 text-xs text-muted">
                        {formatRange(trip.start_date, trip.end_date) || trip.destination || 'No dates yet'}
                      </span>
                    </button>
                  )
                })}
              </div>
              <UploadDropzone onFiles={onFiles} title="Drop tickets here" className="py-10 sm:py-12" />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
