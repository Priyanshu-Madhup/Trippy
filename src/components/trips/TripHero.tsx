import { Link } from 'react-router-dom'
import { ArrowLeft, Ellipsis, Pencil, Trash2, Upload } from 'lucide-react'
import { DestinationImage } from '@/components/common/DestinationImage'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/misc'
import { plural } from '@/lib/utils'
import { Flag } from '@/components/common/Flag'
import { daysBetween, formatRange, relativeDay, todayISO } from '@/utils/date'
import type { Trip } from '@/types'

export function TripHero({
  trip,
  bookings,
  onEdit,
  onDelete,
  onUpload,
}: {
  trip: Trip
  bookings: number
  onEdit: () => void
  onDelete: () => void
  onUpload: () => void
}) {
  const days = daysBetween(trip.start_date, trip.end_date)
  const upcoming = trip.start_date && trip.start_date > todayISO()
  const heading = trip.destination ?? trip.name

  return (
    <DestinationImage
      src={trip.cover_image_url}
      seed={trip.destination ?? trip.name}
      alt={trip.destination ? `${trip.destination}` : ''}
      priority
      className="grain h-[min(62vh,440px)] min-h-[340px] rounded-b-[32px] sm:mx-6 sm:mt-6 sm:rounded-[32px] lg:mx-10 lg:mt-8"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/35" />

      <div className="pt-safe absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-5">
        <Link
          to="/app"
          aria-label="Back to trips"
          className="grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25"
        >
          <ArrowLeft className="size-[18px]" />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="glass" size="sm" onClick={onEdit} className="hidden sm:inline-flex">
            <Pencil aria-hidden /> Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Trip actions"
              className="grid size-10 place-items-center rounded-full bg-white/15 text-white outline-none backdrop-blur-md transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white"
            >
              <Ellipsis className="size-[18px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem icon={<Upload />} onSelect={onUpload}>
                Upload tickets
              </DropdownMenuItem>
              <DropdownMenuItem icon={<Pencil />} onSelect={onEdit}>
                Edit trip
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem icon={<Trash2 />} destructive onSelect={onDelete}>
                Delete trip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8 lg:p-10">
        <p className="flex items-center gap-2 text-sm font-medium text-white/80">
          <Flag code={trip.country_code} />
          <span>{trip.destination ? trip.name : 'Trip'}</span>
          {trip.country && trip.country !== trip.destination ? <span className="text-white/60">· {trip.country}</span> : null}
        </p>
        <h1 className="mt-1 break-words text-[44px] font-semibold uppercase leading-[0.92] tracking-[-0.045em] sm:text-[64px] lg:text-[80px]">
          {heading}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[15px] font-medium">
          <span>{formatRange(trip.start_date, trip.end_date).toUpperCase() || 'Dates will appear as you add bookings'}</span>
          <span className="text-white/60">{plural(bookings, 'booking')}</span>
          {days !== null && days > 0 ? <span className="text-white/60">{plural(days + 1, 'day')}</span> : null}
          {upcoming ? (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[13px] backdrop-blur-md">{relativeDay(trip.start_date)}</span>
          ) : null}
        </div>
      </div>

      {trip.cover_image_attribution ? (
        <p className="absolute bottom-2 right-4 hidden text-[10px] text-white/50 sm:block">{trip.cover_image_attribution}</p>
      ) : null}
    </DestinationImage>
  )
}

export function TripHeroSkeleton() {
  return (
    <div className="relative h-[min(62vh,440px)] min-h-[340px] overflow-hidden rounded-b-[32px] sm:mx-6 sm:mt-6 sm:rounded-[32px] lg:mx-10 lg:mt-8">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute bottom-8 left-6 space-y-3 sm:left-8">
        <div className="h-4 w-28 rounded-full bg-white/40 dark:bg-white/10" />
        <div className="h-14 w-64 rounded-2xl bg-white/50 dark:bg-white/10" />
        <div className="h-4 w-48 rounded-full bg-white/40 dark:bg-white/10" />
      </div>
    </div>
  )
}
