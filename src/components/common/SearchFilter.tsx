import { ArrowUpDown, Search, X } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-faint" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-full border border-line bg-surface pl-11 pr-10 text-[15px] shadow-soft outline-none transition placeholder:text-faint focus:border-line-strong focus:ring-4 focus:ring-ring/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  counts,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { key: T; label: string }[]
  counts?: Partial<Record<T, number>>
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {options.map((o) => {
        const active = o.key === value
        const count = counts?.[o.key]
        if (count === 0 && o.key !== 'all' && !active) return null
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition',
              active ? 'bg-primary text-primary-ink' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-surface-2',
            )}
          >
            {o.label}
            {count !== undefined ? <span className={cn('text-xs tabular', active ? 'opacity-70' : 'text-faint')}>{count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export type SortKey = 'date' | 'recent' | 'type'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Travel date' },
  { key: 'recent', label: 'Recently uploaded' },
  { key: 'type', label: 'Type' },
]

export function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium shadow-soft outline-none transition hover:bg-surface-2 focus-visible:ring-4 focus-visible:ring-ring/25"
        aria-label="Sort tickets"
      >
        <ArrowUpDown className="size-4 text-muted" aria-hidden />
        <span className="hidden sm:inline">{SORTS.find((s) => s.key === value)?.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        {SORTS.map((s) => (
          <DropdownMenuItem key={s.key} onSelect={() => onChange(s.key)} className={s.key === value ? 'font-semibold' : undefined}>
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
