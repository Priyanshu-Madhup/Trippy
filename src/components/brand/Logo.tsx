import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/utils'

/**
 * Brand mark: a dotted route arcing from an origin point to a destination
 * ring — journey, route and location in one glyph.
 */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-8', className)} aria-hidden>
      <rect width="64" height="64" rx="18" className={inverted ? 'fill-white' : 'fill-ink'} />
      <path
        d="M18 45 C 21 26, 36 17, 46 19"
        fill="none"
        className={inverted ? 'stroke-[#111110]' : 'stroke-bg'}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="0.1 8.2"
      />
      <circle cx="18" cy="45" r="5" className={inverted ? 'fill-[#111110]' : 'fill-bg'} />
      <circle cx="46" cy="19" r="6.5" fill="none" stroke="#E8B26A" strokeWidth="4" />
    </svg>
  )
}

export function Logo({ className, inverted, showWordmark = true }: { className?: string; inverted?: boolean; showWordmark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark inverted={inverted} />
      {showWordmark ? (
        <span className={cn('text-[19px] font-semibold tracking-[-0.03em]', inverted ? 'text-white' : 'text-ink')}>
          {BRAND.name.toLowerCase()}
        </span>
      ) : (
        <span className="sr-only">{BRAND.name}</span>
      )}
    </span>
  )
}
