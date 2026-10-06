import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { DestinationImage } from '@/components/common/DestinationImage'
import { UploadDropzone } from './UploadDropzone'
import { useTrips } from '@/hooks/useTrips'
import { useUploads } from '@/hooks/useUpload'
import { formatRange, todayISO } from '@/utils/date'
import { cn } from '@/lib/utils'

/** Upload from anywhere: pick a trip (defaults to the next upcoming one), then drop files. */
export function QuickUploadDialog({
  open,
  onOpenChange,
  tripId,
  onCreateTrip,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId?: string
  onCreateTrip: () => void
}) {
  const navigate = useNavigate()
  const { data: trips, isLoading } = useTrips()
  const { enqueue } = useUploads()

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
    if (open) setSelected(tripId ?? sorted[0]?.id ?? null)
  }, [open, tripId, sorted])

  function onFiles(files: File[]) {
    if (!selected) return
    enqueue(selected, files)
    onOpenChange(false)
    navigate(`/app/trip/${selected}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Upload a ticket" description="Choose a trip, then drop your booking confirmation.">
        <div className="space-y-5 px-6 pb-6 pt-5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl bg-surface-2 p-5 text-center">
              <p className="text-sm text-muted">Create a trip first — your tickets will live inside it.</p>
              <Button
                className="mt-4"
                onClick={() => {
                  onOpenChange(false)
                  onCreateTrip()
                }}
              >
                <Plus aria-hidden /> New trip
              </Button>
            </div>
          ) : (
            <>
              <div role="radiogroup" aria-label="Trip" className="no-scrollbar -mx-6 flex snap-x gap-2.5 overflow-x-auto px-6 pb-1">
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
