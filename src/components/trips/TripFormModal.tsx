import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCreateTrip, useUpdateTrip } from '@/hooks/useTrips'
import type { Trip } from '@/types'

/** Create a new trip, or edit an existing one (pass `trip`). */
export function TripFormModal({
  open,
  onOpenChange,
  trip,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip?: Trip | null
}) {
  const navigate = useNavigate()
  const create = useCreateTrip()
  const update = useUpdateTrip()
  const editing = !!trip

  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [errors, setErrors] = useState<{ name?: string; end?: string }>({})

  useEffect(() => {
    if (!open) return
    setName(trip?.name ?? '')
    setDestination(trip?.destination ?? '')
    setStart(trip?.start_date ?? '')
    setEnd(trip?.end_date ?? '')
    setErrors({})
  }, [open, trip])

  const pending = create.isPending || update.isPending

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = 'Give your trip a name.'
    if (start && end && end < start) next.end = 'The end date must be after the start date.'
    setErrors(next)
    if (Object.keys(next).length) return

    try {
      if (trip) {
        await update.mutateAsync({
          trip,
          patch: {
            name: name.trim(),
            destination: destination.trim() || null,
            start_date: start || null,
            end_date: end || null,
          },
        })
        toast.success('Trip updated')
        onOpenChange(false)
      } else {
        const created = await create.mutateAsync({ name, destination, start_date: start, end_date: end })
        onOpenChange(false)
        navigate(`/app/trip/${created.id}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the trip.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={editing ? 'Edit trip' : 'New trip'}
        description={editing ? 'Update the details of this journey.' : 'Name it now — we’ll fill in the rest from your bookings.'}
      >
        <form onSubmit={onSubmit} noValidate className="space-y-5 px-6 pb-6 pt-5">
          <Field label="Trip name" htmlFor="trip-name" error={errors.name}>
            <Input
              id="trip-name"
              autoFocus
              placeholder="Europe 2026"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'trip-name-error' : undefined}
            />
          </Field>

          <Field
            label="Destination"
            htmlFor="trip-destination"
            hint={
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-sun" aria-hidden />
                Optional — we’ll detect it from your tickets.
              </span>
            }
          >
            <Input
              id="trip-destination"
              placeholder="Paris"
              value={destination}
              maxLength={80}
              onChange={(e) => setDestination(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" htmlFor="trip-start">
              <Input id="trip-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="End" htmlFor="trip-end" error={errors.end}>
              <Input
                id="trip-end"
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
                aria-invalid={!!errors.end}
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} className="sm:min-w-36">
              {editing ? 'Save changes' : 'Create trip'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
