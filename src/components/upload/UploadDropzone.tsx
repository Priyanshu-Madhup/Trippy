import { useRef, useState, type DragEvent } from 'react'
import { motion } from 'framer-motion'
import { Camera, FileUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ACCEPT_ATTR } from '@/utils/file'
import { cn } from '@/lib/utils'

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/**
 * Drag & drop + file picker + (on phones) camera capture. Multiple files.
 * `variant="hero"` is the big empty-state target, `compact` fits sidebars.
 */
export function UploadDropzone({
  onFiles,
  variant = 'hero',
  className,
  title,
}: {
  onFiles: (files: File[]) => void
  variant?: 'hero' | 'compact'
  className?: string
  title?: string
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  function take(list: FileList | null) {
    const files = list ? Array.from(list) : []
    if (files.length) onFiles(files)
  }

  const dragProps = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault()
      depth.current++
      setDragging(true)
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault()
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      depth.current = 0
      setDragging(false)
      take(e.dataTransfer.files)
    },
  }

  const inputs = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )

  if (variant === 'compact') {
    return (
      <div
        {...dragProps}
        className={cn(
          'rounded-[22px] border border-dashed border-line-strong bg-surface/60 p-4 transition-colors',
          dragging && 'border-ink/40 bg-surface-2',
          className,
        )}
      >
        {inputs}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex w-full items-center gap-3 rounded-2xl text-left outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-ink">
            <Plus className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{title ?? 'Upload ticket'}</span>
            <span className="block text-[13px] text-muted">{dragging ? 'Drop to upload' : 'PDF, PNG, JPG or WEBP'}</span>
          </span>
        </button>
      </div>
    )
  }

  return (
    <motion.div
      {...(dragProps as object)}
      animate={{ scale: dragging ? 1.01 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative overflow-hidden rounded-[28px] border-[1.5px] border-dashed border-line-strong bg-surface px-6 py-12 text-center transition-colors sm:py-16',
        dragging && 'border-ink/40 bg-surface-2',
        className,
      )}
    >
      {inputs}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-sun/10 to-transparent" aria-hidden />
      <motion.div
        animate={{ y: dragging ? -4 : 0 }}
        className="relative mx-auto grid size-16 place-items-center rounded-[22px] bg-primary text-primary-ink shadow-lift"
      >
        <FileUp className="size-7" aria-hidden />
      </motion.div>
      <h3 className="relative mt-6 text-xl font-semibold tracking-tight">{dragging ? 'Release to upload' : (title ?? 'Drop your tickets here')}</h3>
      <p className="relative mx-auto mt-1.5 max-w-xs text-[15px] text-muted">
        or upload a PDF or image — we’ll read it and organise everything for you.
      </p>
      <div className="relative mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
        <Button size="lg" onClick={() => fileInput.current?.click()} className="w-full sm:w-auto">
          <Plus aria-hidden />
          Upload ticket
        </Button>
        {isTouch ? (
          <Button size="lg" variant="secondary" onClick={() => cameraInput.current?.click()} className="w-full sm:w-auto">
            <Camera aria-hidden />
            Take a photo
          </Button>
        ) : null}
      </div>
      <p className="relative mt-5 text-xs tracking-wide text-faint">PDF · PNG · JPG · JPEG · WEBP — up to 20 MB each</p>
    </motion.div>
  )
}
