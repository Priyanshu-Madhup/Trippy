import { NavLink } from 'react-router-dom'
import { House, Map, Plus, Settings, UserRound, type LucideIcon } from 'lucide-react'
import { useUI } from '@/hooks/useUI'
import { cn } from '@/lib/utils'

function Tab({ to, label, icon: Icon, end }: { to: string; label: string; icon: LucideIcon; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
          isActive ? 'text-ink' : 'text-faint',
        )
      }
    >
      <Icon className="size-[22px]" aria-hidden />
      {label}
    </NavLink>
  )
}

/** Bottom navigation for phones/tablets. The raised button starts a new trip — tickets are uploaded inside a trip. */
export function MobileNav() {
  const { openCreateTrip } = useUI()

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-elevated/85 pb-safe backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center px-3">
        <Tab to="/app" label="Home" icon={House} end />
        <Tab to="/app/trips" label="Trips" icon={Map} />
        <div className="flex flex-1 justify-center">
          <button
            onClick={openCreateTrip}
            aria-label="New trip"
            className="-mt-7 grid size-[58px] place-items-center rounded-full bg-primary text-primary-ink shadow-float ring-[5px] ring-bg transition active:scale-95"
          >
            <Plus className="size-6" aria-hidden />
          </button>
        </div>
        <Tab to="/app/profile" label="Profile" icon={UserRound} />
        <Tab to="/app/settings" label="Settings" icon={Settings} />
      </div>
    </nav>
  )
}
