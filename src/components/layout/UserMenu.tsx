import { useNavigate } from 'react-router-dom'
import { LogOut, Monitor, Moon, Settings, Sun, UserRound } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar } from './Avatar'
import { useAuth, useDisplayName, useProfile } from '@/hooks/useAuth'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function UserMenu({ withName, className }: { withName?: boolean; className?: string }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const name = useDisplayName()
  const { theme, setTheme } = useTheme()
  const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
  const ThemeIcon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-3 rounded-full outline-none transition focus-visible:ring-4 focus-visible:ring-ring/25',
          withName && 'w-full rounded-2xl p-2 text-left hover:bg-surface-2',
          className,
        )}
        aria-label="Account menu"
      >
        <Avatar name={name} src={profile?.avatar_url} size={withName ? 36 : 38} />
        {withName ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="block truncate text-xs text-muted">{user?.email}</span>
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={withName ? 'start' : 'end'} side={withName ? 'top' : 'bottom'} className="w-60">
        <DropdownMenuLabel>{user?.email ?? name}</DropdownMenuLabel>
        <DropdownMenuItem icon={<UserRound />} onSelect={() => navigate('/app/profile')}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Settings />} onSelect={() => navigate('/app/settings')}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<ThemeIcon />}
          onSelect={(e) => {
            e.preventDefault()
            setTheme(nextTheme)
          }}
        >
          Theme: <span className="capitalize text-muted">{theme}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          icon={<LogOut />}
          destructive
          onSelect={async () => {
            await signOut()
            navigate('/login', { replace: true })
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
