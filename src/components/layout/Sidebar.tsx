import { NavLink } from 'react-router-dom'
import { House, Map, Plus, Settings, Upload, UserRound } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { UserMenu } from './UserMenu'
import { useUI } from '@/hooks/useUI'
import { isDemoMode } from '@/lib/env'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/app', label: 'Home', icon: House, end: true },
  { to: '/app/trips', label: 'Trips', icon: Map, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings, end: false },
  { to: '/app/profile', label: 'Profile', icon: UserRound, end: false },
]

export function Sidebar() {
  const { openCreateTrip, openUpload } = useUI()
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-line bg-bg-elevated/70 px-4 pb-4 pt-6 backdrop-blur-xl lg:flex">
      <NavLink to="/app" className="mb-8 px-2 outline-none" aria-label="Home">
        <Logo />
      </NavLink>

      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Travel</p>
      <nav aria-label="Main" className="space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium transition-colors',
                isActive ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            <Icon className="size-[19px]" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 space-y-2 px-1">
        <Button className="w-full justify-start" onClick={openCreateTrip}>
          <Plus aria-hidden /> New trip
        </Button>
        <Button variant="secondary" className="w-full justify-start" onClick={() => openUpload()}>
          <Upload aria-hidden /> Upload ticket
        </Button>
      </div>

      <div className="mt-auto space-y-3">
        {isDemoMode ? (
          <div className="rounded-2xl border border-line bg-surface p-3.5 text-xs leading-relaxed text-muted">
            <span className="font-semibold text-ink">Demo mode.</span> Data stays in this browser. Add Supabase keys to{' '}
            <code className="font-mono text-[11px]">.env</code> to go live.
          </div>
        ) : null}
        <UserMenu withName />
      </div>
    </aside>
  )
}
