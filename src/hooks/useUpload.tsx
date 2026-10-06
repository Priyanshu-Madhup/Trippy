import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth, useProfile } from './useAuth'
import { useInvalidateTripData } from './useTickets'
import { processTicket, type ProcessingStage } from '@/services/processing'
import { uploadTicket } from '@/services/tickets'
import { ticketView } from '@/utils/ticket'
import { validateFile } from '@/utils/file'
import { uuid } from '@/lib/utils'
import type { Ticket } from '@/types'

export type UploadStage = 'queued' | 'uploading' | ProcessingStage | 'done' | 'failed'

export interface UploadItem {
  key: string
  tripId: string
  ticketId: string | null
  fileName: string
  fileSize: number
  stage: UploadStage
  progress: number
  error: string | null
}

interface UploadContextValue {
  items: UploadItem[]
  enqueue: (tripId: string, files: File[]) => void
  retry: (ticket: Ticket) => void
  dismiss: (key: string) => void
}

const UploadContext = createContext<UploadContextValue | null>(null)
// One at a time keeps us under Groq's tokens-per-minute limit on the free tier.
const CONCURRENCY = 1

type Job =
  | { kind: 'upload'; key: string; tripId: string; file: File }
  | { kind: 'retry'; key: string; tripId: string; ticket: Ticket }

export function UploadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const invalidate = useInvalidateTripData()
  const [items, setItems] = useState<UploadItem[]>([])
  const queue = useRef<Job[]>([])
  const running = useRef(0)

  const notify = profile?.preferences?.notifications !== false

  const patch = useCallback((key: string, p: Partial<UploadItem>) => {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)))
  }, [])

  const finish = useCallback((key: string, delay = 900) => {
    setTimeout(() => setItems((list) => list.filter((i) => i.key !== key)), delay)
  }, [])

  const run = useCallback(
    async (job: Job) => {
      const { key, tripId } = job
      try {
        let ticket: Ticket
        let file: Blob | undefined
        if (job.kind === 'upload') {
          if (!user) throw new Error('You need to be signed in.')
          patch(key, { stage: 'uploading', progress: 0 })
          const res = await uploadTicket({
            tripId,
            userId: user.id,
            file: job.file,
            onProgress: (progress) => patch(key, { progress }),
          })
          ticket = res.ticket
          file = res.file
          patch(key, { ticketId: ticket.id, progress: 1 })
          invalidate(tripId)
        } else {
          ticket = job.ticket
        }

        const done = await processTicket(ticket, { file, onStage: (stage) => patch(key, { stage }) })
        patch(key, { stage: 'done' })
        invalidate(tripId)
        finish(key)
        if (notify) {
          const view = ticketView(done)
          toast.success(`${view.meta.label} added`, { description: view.title })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't read this document."
        patch(key, { stage: 'failed', error: message })
        invalidate(tripId)
        // A failed ticket row (if one was created) renders its own retry card.
        finish(key, job.kind === 'upload' ? 4000 : 600)
        if (notify) toast.error(message)
      }
    },
    [user, patch, invalidate, finish, notify],
  )

  const pump = useCallback(() => {
    while (running.current < CONCURRENCY && queue.current.length > 0) {
      const job = queue.current.shift() as Job
      running.current++
      void run(job).finally(() => {
        running.current--
        pump()
      })
    }
  }, [run])

  const enqueue = useCallback(
    (tripId: string, files: File[]) => {
      const accepted: Job[] = []
      const newItems: UploadItem[] = []
      for (const file of files) {
        const problem = validateFile(file)
        if (problem) {
          toast.error(problem)
          continue
        }
        const key = uuid()
        accepted.push({ kind: 'upload', key, tripId, file })
        newItems.push({ key, tripId, ticketId: null, fileName: file.name, fileSize: file.size, stage: 'queued', progress: 0, error: null })
      }
      if (!accepted.length) return
      setItems((list) => [...list, ...newItems])
      queue.current.push(...accepted)
      pump()
    },
    [pump],
  )

  const retry = useCallback(
    (ticket: Ticket) => {
      const key = uuid()
      setItems((list) => [
        ...list,
        {
          key,
          tripId: ticket.trip_id,
          ticketId: ticket.id,
          fileName: ticket.file_name ?? 'Document',
          fileSize: ticket.file_size ?? 0,
          stage: 'reading',
          progress: 1,
          error: null,
        },
      ])
      queue.current.push({ kind: 'retry', key, tripId: ticket.trip_id, ticket })
      pump()
    },
    [pump],
  )

  const dismiss = useCallback((key: string) => setItems((list) => list.filter((i) => i.key !== key)), [])

  const value = useMemo(() => ({ items, enqueue, retry, dismiss }), [items, enqueue, retry, dismiss])
  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

export function useUploads() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploads must be used inside UploadProvider')
  return ctx
}
