import * as SwitchPrimitive from '@radix-ui/react-switch'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton rounded-xl', className)} {...props} />
}

export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
  label,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  id?: string
  disabled?: boolean
  label?: string
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className="relative h-7 w-12 shrink-0 rounded-full bg-surface-3 transition-colors data-[state=checked]:bg-primary disabled:opacity-50"
    >
      <SwitchPrimitive.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow-soft transition-transform data-[state=checked]:translate-x-[22px] dark:data-[state=checked]:bg-bg" />
    </SwitchPrimitive.Root>
  )
}

/** Pill-style segmented control (radio group semantics). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  label: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-full bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full font-medium transition-all [&_svg]:size-4',
              size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-sm',
              active ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2', className)}>
      {children}
    </span>
  )
}
