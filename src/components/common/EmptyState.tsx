import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function EmptyState({
  title,
  description,
  action,
  illustration,
  className,
}: {
  title: string
  description: string
  action?: ReactNode
  illustration?: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn('flex flex-col items-center px-6 py-14 text-center', className)}
    >
      {illustration ?? <RouteIllustration />}
      <h2 className="mt-6 text-balance text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h2>
      <p className="mt-2 max-w-sm text-pretty text-[15px] leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-7">{action}</div> : null}
    </motion.div>
  )
}

export function RouteIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 120" className={cn('h-28 w-auto text-ink', className)} aria-hidden>
      <rect x="10" y="22" width="200" height="86" rx="22" className="fill-surface stroke-line-strong" strokeWidth="1" />
      <path d="M44 84 C 70 40, 140 30, 176 52" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
      <circle cx="44" cy="84" r="6" className="fill-ink" />
      <circle cx="176" cy="52" r="8" fill="none" stroke="#E8B26A" strokeWidth="3" />
      <rect x="34" y="34" width="46" height="6" rx="3" className="fill-surface-3" />
      <rect x="140" y="88" width="46" height="6" rx="3" className="fill-surface-3" />
    </svg>
  )
}
