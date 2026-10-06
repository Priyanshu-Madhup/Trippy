import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useRef, type ReactNode, type RefObject } from 'react'
import { useBackToClose } from '@/hooks/useBackToClose'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

/**
 * Responsive modal: a bottom sheet on phones, a centred card from `sm` up.
 * Radix handles focus trapping, Escape, scroll lock and ARIA wiring.
 */
export function DialogContent({
  title,
  description,
  children,
  className,
  hideHeader,
  size = 'md',
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
  hideHeader?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'sheet fixed z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface text-ink shadow-float outline-none',
          'inset-x-0 bottom-0 rounded-t-[28px] pb-safe',
          'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[86dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:pb-0',
          size === 'sm' && 'sm:max-w-sm',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl',
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div className={cn('flex items-start justify-between gap-4 px-6 pt-4 sm:pt-6', hideHeader && 'sr-only')}>
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-xl font-semibold tracking-tight">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            ref={closeRef}
            className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-[18px]" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        <BackButtonCloses target={closeRef} />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Rendered inside Radix's Content, which only mounts while open — so the phone back button closes the dialog. */
function BackButtonCloses({ target }: { target: RefObject<HTMLButtonElement | null> }) {
  useBackToClose(true, () => target.current?.click())
  return null
}
