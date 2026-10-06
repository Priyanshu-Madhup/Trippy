import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUpdateTicket } from '@/hooks/useTickets'
import { DOCUMENT_TYPES, type DocumentType } from '@/types/extraction'
import { TYPE_META } from '@/utils/ticket'
import type { Ticket, TicketPatch } from '@/types'

interface FormState {
  document_type: DocumentType
  title: string
  travel_date: string
  start_time: string
  end_date: string
  end_time: string
  origin: string
  destination: string
  provider_name: string
  booking_reference: string
  notes: string
}

function fromTicket(t: Ticket): FormState {
  return {
    document_type: t.document_type,
    title: t.title ?? '',
    travel_date: t.travel_date ?? '',
    start_time: t.start_time ?? '',
    end_date: t.end_date ?? '',
    end_time: t.end_time ?? '',
    origin: t.origin ?? '',
    destination: t.destination ?? '',
    provider_name: t.provider_name ?? '',
    booking_reference: t.booking_reference ?? '',
    notes: t.notes ?? '',
  }
}

const orNull = (v: string) => (v.trim() ? v.trim() : null)

/** AI output is a starting point — every summary field is editable. */
export function TicketEditModal({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const update = useUpdateTicket()
  const [form, setForm] = useState<FormState | null>(null)

  useEffect(() => {
    if (ticket) setForm(fromTicket(ticket))
  }, [ticket])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))
  const isTransport = form && ['flight', 'train', 'bus'].includes(form.document_type)
  const isStay = form?.document_type === 'hotel'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ticket || !form) return
    if (form.end_date && form.travel_date && form.end_date < form.travel_date) {
      toast.error('The end date must be after the start date.')
      return
    }
    const patch: TicketPatch = {
      document_type: form.document_type,
      title: orNull(form.title),
      travel_date: orNull(form.travel_date),
      start_time: orNull(form.start_time),
      end_date: orNull(form.end_date),
      end_time: orNull(form.end_time),
      origin: orNull(form.origin),
      destination: orNull(form.destination),
      provider_name: orNull(form.provider_name),
      booking_reference: orNull(form.booking_reference),
      notes: orNull(form.notes),
      needs_review: false,
    }
    if (form.document_type === 'flight') patch.airline_name = patch.provider_name
    try {
      await update.mutateAsync({ ticket, patch })
      toast.success('Details saved')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Edit details" description="Correct anything the AI got wrong — your edits always win." size="lg">
        {form ? (
          <form onSubmit={onSubmit} className="grid gap-4 px-6 pb-6 pt-5 sm:grid-cols-2">
            <Field label="Type" htmlFor="t-type">
              <select
                id="t-type"
                value={form.document_type}
                onChange={(e) => set('document_type', e.target.value as DocumentType)}
                className="h-12 w-full appearance-none rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-line-strong focus:ring-4 focus:ring-ring/25"
              >
                {DOCUMENT_TYPES.filter((t) => t !== 'unknown').map((t) => (
                  <option key={t} value={t}>
                    {TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" htmlFor="t-title">
              <Input id="t-title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={140} />
            </Field>

            <Field label={isStay ? 'Check-in date' : 'Date'} htmlFor="t-date">
              <Input id="t-date" type="date" value={form.travel_date} onChange={(e) => set('travel_date', e.target.value)} />
            </Field>
            <Field label={isStay ? 'Check-in time' : 'Time'} htmlFor="t-time">
              <Input id="t-time" type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
            </Field>

            {isTransport || isStay ? (
              <>
                <Field label={isStay ? 'Check-out date' : 'Arrival date'} htmlFor="t-end-date">
                  <Input id="t-end-date" type="date" value={form.end_date} min={form.travel_date || undefined} onChange={(e) => set('end_date', e.target.value)} />
                </Field>
                <Field label={isStay ? 'Check-out time' : 'Arrival time'} htmlFor="t-end-time">
                  <Input id="t-end-time" type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
                </Field>
              </>
            ) : null}

            {isTransport ? (
              <Field label="From" htmlFor="t-origin">
                <Input id="t-origin" value={form.origin} onChange={(e) => set('origin', e.target.value)} placeholder="Bengaluru" />
              </Field>
            ) : null}
            <Field label={isTransport ? 'To' : 'City'} htmlFor="t-dest" className={isTransport ? undefined : 'sm:col-span-2'}>
              <Input id="t-dest" value={form.destination} onChange={(e) => set('destination', e.target.value)} placeholder="Paris" />
            </Field>

            <Field label="Provider" htmlFor="t-provider">
              <Input
                id="t-provider"
                value={form.provider_name}
                onChange={(e) => set('provider_name', e.target.value)}
                placeholder={form.document_type === 'flight' ? 'Airline' : form.document_type === 'hotel' ? 'Hotel' : 'Company'}
              />
            </Field>
            <Field label="Booking reference" htmlFor="t-ref">
              <Input
                id="t-ref"
                value={form.booking_reference}
                onChange={(e) => set('booking_reference', e.target.value)}
                className="font-mono tracking-wide"
                autoCapitalize="characters"
              />
            </Field>

            <Field label="Notes" htmlFor="t-notes" className="sm:col-span-2">
              <Textarea id="t-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} maxLength={1000} placeholder="Gate closes 45 min before departure…" />
            </Field>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={update.isPending} className="sm:min-w-32">
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
