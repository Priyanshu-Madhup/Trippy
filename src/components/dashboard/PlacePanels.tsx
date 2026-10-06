import { motion } from 'framer-motion'
import { Droplets, ExternalLink, Newspaper, Thermometer, Wind } from 'lucide-react'
import { Skeleton } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { formatWeekday, todayISO } from '@/utils/date'
import { temp, weatherIcon, weatherLabel } from '@/utils/weather'
import type { PlaceInfo } from '@/types/place'

const panel = 'rounded-[26px] border border-line bg-surface p-5 shadow-soft sm:p-6'

export function WeatherCard({ place, info, loading }: { place: string; info: PlaceInfo | undefined; loading: boolean }) {
  const w = info?.weather
  if (loading) {
    return (
      <div className={panel} aria-hidden>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-6 h-14 w-28" />
        <div className="mt-6 grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }
  if (!w) {
    return (
      <div className={panel}>
        <p className="text-sm font-semibold">Weather in {place}</p>
        <p className="mt-2 text-sm text-muted">Weather isn’t available right now.</p>
      </div>
    )
  }
  const Icon = weatherIcon(w.current.condition, w.current.daylight)
  const today = todayISO()
  const days = w.days.filter((d) => d.date >= today).slice(0, 5)

  return (
    <section className={cn(panel, 'relative overflow-hidden')} aria-label={`Weather in ${place}`}>
      <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-sun/15 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">Weather now</p>
          <p className="truncate text-sm font-semibold">{w.location ?? place}</p>
        </div>
        <Icon className="size-9 shrink-0 text-sun" strokeWidth={1.6} aria-hidden />
      </div>
      <div className="relative mt-3 flex items-end gap-3">
        <p className="text-[56px] font-semibold leading-none tracking-[-0.05em] tabular">{temp(w.current.temperature)}</p>
        <p className="pb-1.5 text-[15px] font-medium text-ink-2">{weatherLabel(w.current.condition)}</p>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
        {w.current.feelsLike != null ? (
          <span className="inline-flex items-center gap-1">
            <Thermometer className="size-3.5" aria-hidden /> Feels {temp(w.current.feelsLike)}
          </span>
        ) : null}
        {w.current.humidity != null ? (
          <span className="inline-flex items-center gap-1">
            <Droplets className="size-3.5" aria-hidden /> {Math.round(w.current.humidity * 100)}%
          </span>
        ) : null}
        {w.current.wind != null ? (
          <span className="inline-flex items-center gap-1">
            <Wind className="size-3.5" aria-hidden /> {Math.round(w.current.wind)} km/h
          </span>
        ) : null}
      </div>

      {days.length ? (
        <ol className="relative mt-5 grid grid-cols-5 gap-1.5">
          {days.map((d, i) => {
            const DayIcon = weatherIcon(d.condition)
            return (
              <li key={d.date} className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface-2/70 px-1 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{i === 0 ? 'Today' : formatWeekday(d.date)}</span>
                <DayIcon className="size-5 text-ink-2" aria-label={weatherLabel(d.condition)} />
                <span className="text-[13px] font-semibold tabular">{temp(d.max)}</span>
                <span className="-mt-1 text-[11px] text-muted tabular">{temp(d.min)}</span>
              </li>
            )
          })}
        </ol>
      ) : null}
      <p className="relative mt-3 text-[10px] text-faint">{w.source === 'duckduckgo' ? 'Weather via DuckDuckGo · Apple Weather' : 'Weather via Open-Meteo'}</p>
    </section>
  )
}

export function AboutPlace({ info, loading }: { info: PlaceInfo | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className={panel} aria-hidden>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
    )
  }
  const about = info?.about
  if (!about) return null
  return (
    <section className={panel} aria-label={`About ${about.title}`}>
      <div className="flex items-start gap-4">
        {about.image ? (
          <img src={about.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-2xl object-cover" />
        ) : null}
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">About</p>
          <h3 className="text-lg font-semibold tracking-tight">{about.title}</h3>
        </div>
      </div>
      <p className="mt-3 line-clamp-5 text-[14px] leading-relaxed text-ink-2">{about.extract}</p>
      <a
        href={about.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink"
      >
        Read more on Wikipedia <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </section>
  )
}

function timeAgo(iso: string | null): string | null {
  if (!iso) return null
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (Number.isNaN(mins) || mins < 0) return null
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

export function PlaceNews({ place, info, loading }: { place: string; info: PlaceInfo | undefined; loading: boolean }) {
  const news = (info?.news ?? []).slice(0, 6)
  if (!loading && news.length === 0) return null
  return (
    <section aria-label={`News from ${place}`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Around {place}</h2>
          <p className="mt-0.5 text-sm text-muted">Latest local news before you go.</p>
        </div>
        <Newspaper className="mb-1 size-5 text-faint" aria-hidden />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-[22px]" />)
          : news.map((n, i) => (
              <motion.a
                key={n.url}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group flex flex-col overflow-hidden rounded-[22px] border border-line bg-surface shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
              >
                {n.image ? (
                  <img src={n.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-32 w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                ) : null}
                <div className="flex flex-1 flex-col p-4">
                  <p className="line-clamp-3 text-[15px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-2">{n.title}</p>
                  {n.excerpt && !n.image ? <p className="mt-1.5 line-clamp-2 text-[13px] text-muted">{n.excerpt}</p> : null}
                  <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted">
                    <span className="truncate font-medium">{n.source}</span>
                    {timeAgo(n.date) ? <span className="shrink-0 text-faint">· {timeAgo(n.date)}</span> : null}
                  </p>
                </div>
              </motion.a>
            ))}
      </div>
    </section>
  )
}
