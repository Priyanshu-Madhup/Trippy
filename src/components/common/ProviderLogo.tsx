import { useState } from 'react'
import { cn, hashHue, initials } from '@/lib/utils'

/**
 * Brand logo with a graceful monogram fallback — never a broken image.
 * The logo sits on a white tile so favicons look consistent in dark mode.
 */
export function ProviderLogo({
  src,
  name,
  code,
  size = 40,
  className,
  rounded = 'rounded-xl',
}: {
  src: string | null | undefined
  name: string | null | undefined
  /** Preferred monogram text, e.g. an IATA code */
  code?: string | null
  size?: number
  className?: string
  rounded?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = !!src && failedSrc === src
  const label = name ?? code ?? 'Provider'
  const hue = hashHue(label)

  if (src && !failed) {
    return (
      <span
        className={cn('inline-grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-black/5', rounded, className)}
        style={{ width: size, height: size }}
      >
        <img
          src={src}
          alt={`${label} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="size-[78%] object-contain"
        />
      </span>
    )
  }

  const text = (code && code.length <= 3 ? code : initials(name, '•')).toUpperCase()
  return (
    <span
      role="img"
      aria-label={`${label} logo`}
      className={cn('inline-grid shrink-0 place-items-center font-semibold tracking-tight text-white', rounded, className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.34),
        background: `linear-gradient(140deg, hsl(${hue} 45% 38%), hsl(${(hue + 30) % 360} 55% 52%))`,
      }}
    >
      {text}
    </span>
  )
}

export function AirlineLogo(props: { src: string | null | undefined; name: string | null | undefined; code: string | null | undefined; size?: number; className?: string }) {
  return <ProviderLogo {...props} />
}
