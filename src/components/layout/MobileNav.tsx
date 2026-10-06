import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { CalendarPlus, House, Map, Plus, Settings, Upload, UserRound } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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

/** Bottom navigation for phones/tablets, with a raised Add button. */
export function MobileNav() {
  const { openCreateTrip, openUpload } = useUI()
  const [sheet, setSheet] = useState(false)

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-elevated/85 pb-safe backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-center px-3">
          <Tab to="/app" label="Home" icon={House} end />
          <Tab to="/app/trips" label="Trips" icon={Map} />
          <div className="flex flex-1 justify-center">
            <button
              onClick={() => setSheet(true)}
              aria-label="Add"
              className="-mt-7 grid size-[58px] place-items-center rounded-full bg-primary text-primary-ink shadow-float ring-[5px] ring-bg transition active:scale-95"
            >
              <Plus className="size-6" aria-hidden />
            </button>
          </div>
          <Tab to="/app/profile" label="Profile" icon={UserRound} />
          <Tab to="/app/settings" label="Settings" icon={Settings} />
        </div>
      </nav>

      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent title="Add" hideHeader size="sm">
          <div className="grid gap-2 p-4 pt-3">
            <SheetAction
              icon={<Upload className="size-5" />}
              title="Upload a ticket"
              text="PDF, screenshot or photo"
              onClick={() => {
                setSheet(false)
                openUpload()
              }}
            />
            <SheetAction
              icon={<CalendarPlus className="size-5" />}
              title="New trip"
              text="Start a new journey"
              onClick={() => {
                setSheet(false)
                openCreateTrip()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SheetAction({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 rounded-2xl p-3 text-left transition hover:bg-surface-2 active:scale-[0.99]">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-ink">{icon}</span>
      <span>
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
    </button>
  )
}
