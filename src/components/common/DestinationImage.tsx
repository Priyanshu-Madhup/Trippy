import { useState, type ReactNode } from 'react'
import { cn, gradientFor } from '@/lib/utils'

/**
 * Destination / hotel photography with a fade-in and a destination-tinted
 * gradient underneath — so there is never a broken image or empty box.
 */
export function DestinationImage({
  src,
  seed,
  alt,
  className,
  priority,
  children,
}: {
  src: string | null | undefined
  /** Used for the fallback gradient (usually the destination name). */
  seed: string
  alt: string
  className?: string
  priority?: boolean
  children?: ReactNode
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const loaded = !!src && loadedSrc === src
  const failed = !!src && failedSrc === src
  const show = !!src && !failed

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ background: gradientFor(seed) }}>
      {!show ? <FallbackPattern /> : null}
      {show ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSrc(src ?? null)}
          onError={() => setFailedSrc(src ?? null)}
          className={cn(
            'absolute inset-0 size-full object-cover transition-[opacity,transform] duration-700 ease-out',
            loaded ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0',
          )}
        />
      ) : null}
      {children}
    </div>
  )
}

function FallbackPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-25" preserveAspectRatio="none" viewBox="0 0 400 240" aria-hidden>
      <path d="M-20 200 C 80 120, 180 170, 260 90 S 380 40, 440 60" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
      <path d="M-20 230 C 120 170, 220 220, 300 150 S 400 110, 440 120" fill="none" stroke="white" strokeWidth="1" strokeDasharray="2 9" strokeLinecap="round" opacity="0.6" />
      <circle cx="260" cy="90" r="5" fill="none" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}
