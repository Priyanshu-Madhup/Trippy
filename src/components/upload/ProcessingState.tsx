import { AnimatePresence, motion } from 'framer-motion'
import { Check, CircleAlert, FileText, Sparkles, X } from 'lucide-react'
import type { UploadItem, UploadStage } from '@/hooks/useUpload'
import { cn, formatBytes } from '@/lib/utils'

const STAGE_COPY: Record<UploadStage, string> = {
  queued: 'Waiting in line…',
  uploading: 'Uploading…',
  reading: 'Reading your ticket…',
  identifying: 'Identifying booking…',
  extracting: 'Extracting details…',
  building: 'Building your travel card…',
  finishing: 'Almost there…',
  done: 'Added to your trip',
  failed: 'Couldn’t read this document.',
}

const STAGE_PROGRESS: Record<UploadStage, number> = {
  queued: 0.02,
  uploading: 0,
  reading: 0.34,
  identifying: 0.5,
  extracting: 0.68,
  building: 0.86,
  finishing: 0.95,
  done: 1,
  failed: 1,
}

const STEPS: UploadStage[] = ['uploading', 'reading', 'identifying', 'extracting', 'building']

function progressOf(item: UploadItem) {
  return item.stage === 'uploading' ? 0.04 + item.progress * 0.26 : STAGE_PROGRESS[item.stage]
}

/** Live processing card shown while a ticket is uploaded and analysed. */
export function ProcessingCard({ item, onDismiss }: { item: UploadItem; onDismiss?: () => void }) {
  const failed = item.stage === 'failed'
  const done = item.stage === 'done'
  const stepIndex = STEPS.indexOf(item.stage === 'finishing' ? 'building' : item.stage)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-[26px] border border-line bg-surface p-5 shadow-card"
      role="status"
      aria-live="polite"
    >
      {!failed && !done ? (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,color-mix(in_srgb,var(--sun)_9%,transparent)_50%,transparent_70%)] bg-[length:200%_100%] animate-shimmer" />
      ) : null}

      <div className="relative flex items-start gap-3.5">
        <div
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-2xl',
            failed ? 'bg-danger-bg text-danger' : done ? 'bg-success/12 text-success' : 'bg-surface-2 text-ink',
          )}
        >
          {failed ? <CircleAlert className="size-5" /> : done ? <Check className="size-5" /> : <Sparkles className="size-5 animate-pulse-soft" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="h-6 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={item.stage}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className={cn('truncate text-[15px] font-semibold', failed && 'text-danger')}
              >
                {failed ? (item.error ?? STAGE_COPY.failed) : STAGE_COPY[item.stage]}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-muted">
            <FileText className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{item.fileName}</span>
            {item.fileSize ? <span className="shrink-0 text-faint">· {formatBytes(item.fileSize)}</span> : null}
          </p>
        </div>
        {failed && onDismiss ? (
          <button onClick={onDismiss} className="-m-1 grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Dismiss">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className={cn('h-full rounded-full', failed ? 'bg-danger' : 'bg-ink')}
          initial={{ width: '2%' }}
          animate={{ width: `${Math.round(progressOf(item) * 100)}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
      </div>

      {!failed ? (
        <ol className="relative mt-3 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-500',
                done || i < stepIndex ? 'bg-ink/70' : i === stepIndex ? 'bg-sun' : 'bg-surface-3',
              )}
            />
          ))}
        </ol>
      ) : null}
    </motion.div>
  )
}
