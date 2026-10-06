import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { HardDrive, LogOut, Monitor, Moon, Sparkles, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented, Skeleton, Switch } from '@/components/ui/misc'
import { useAuth, useProfile } from '@/hooks/useAuth'
import { useStats } from '@/hooks/useTickets'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { qk } from '@/lib/queryClient'
import { isDemoMode } from '@/lib/env'
import { backend } from '@/services/backend'
import { enrichMissingVisuals } from '@/services/processing'
import { formatBytes } from '@/lib/utils'
import type { Profile } from '@/types'

const STORAGE_QUOTA = 1024 * 1024 * 1024 // Supabase free tier: 1 GB

export default function Settings() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, signOut } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const { data: stats } = useStats()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState('')

  useEffect(() => {
    if (profile) setName(profile.name ?? '')
  }, [profile])

  const saveProfile = useMutation({
    mutationFn: (patch: Partial<Pick<Profile, 'name' | 'preferences'>>) => backend.updateProfile(patch),
    onSuccess: (p) => qc.setQueryData(qk.profile, p),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save.'),
  })

  const sample = useMutation({
    mutationFn: async (action: 'add' | 'remove') => {
      if (action === 'add') {
        await backend.seedSampleData()
        void enrichMissingVisuals().then(() => qc.invalidateQueries())
      } else {
        await backend.removeSampleData()
      }
      return action
    },
    onSuccess: async (action) => {
      await qc.invalidateQueries()
      toast.success(action === 'add' ? 'Sample trips added' : 'Sample data removed')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  const notifications = profile?.preferences?.notifications !== false
  const used = stats?.storageBytes ?? 0

  return (
    <div className="mx-auto max-w-2xl px-4 pt-safe sm:px-6">
      <header className="pb-8 pt-8 lg:pt-12">
        <h1 className="text-[34px] font-semibold leading-none tracking-[-0.04em] sm:text-[44px]">Settings</h1>
      </header>

      <div className="space-y-6">
        <Section title="Profile">
          {isLoading ? (
            <Skeleton className="h-12" />
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (name.trim()) saveProfile.mutate({ name: name.trim() }, { onSuccess: () => toast.success('Name updated') })
              }}
            >
              <label htmlFor="settings-name" className="sr-only">
                Name
              </label>
              <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name" />
              <Button type="submit" variant="secondary" className="h-12 shrink-0" loading={saveProfile.isPending} disabled={name.trim() === (profile?.name ?? '')}>
                Save
              </Button>
            </form>
          )}
          <Row label="Email" value={user?.email ?? '—'} />
        </Section>

        <Section title="Appearance">
          <Row label="Theme">
            <Segmented<ThemePreference>
              label="Theme"
              size="sm"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'system', label: 'System', icon: <Monitor /> },
                { value: 'light', label: 'Light', icon: <Sun /> },
                { value: 'dark', label: 'Dark', icon: <Moon /> },
              ]}
            />
          </Row>
        </Section>

        <Section title="Notifications">
          <Row label="Processing updates" hint="A short notice when a ticket has been read and added to your trip.">
            <Switch
              label="Processing updates"
              checked={notifications}
              disabled={!profile}
              onCheckedChange={(v) => saveProfile.mutate({ preferences: { ...(profile?.preferences ?? {}), notifications: v } })}
            />
          </Row>
        </Section>

        <Section title="Storage">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-surface-2">
              <HardDrive className="size-5" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {formatBytes(used)} <span className="text-muted">of {formatBytes(STORAGE_QUOTA)}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((used / STORAGE_QUOTA) * 100)}>
                <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(1, Math.min(100, (used / STORAGE_QUOTA) * 100))}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">{stats ? `${stats.documents} documents stored` : '—'}</p>
            </div>
          </div>
        </Section>

        <Section title="Sample data">
          <p className="text-sm text-muted">
            Add a few realistic sample trips to explore the app. They’re flagged as samples and can be removed at any time without touching your
            own data.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" loading={sample.isPending && sample.variables === 'add'} onClick={() => sample.mutate('add')}>
              <Sparkles aria-hidden /> Add sample trips
            </Button>
            <Button variant="ghost" size="sm" loading={sample.isPending && sample.variables === 'remove'} onClick={() => sample.mutate('remove')}>
              Remove sample data
            </Button>
          </div>
        </Section>

        {isDemoMode ? (
          <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
            <span className="font-semibold">Demo mode.</span> Data is stored only in this browser. Configure{' '}
            <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to enable accounts and
            cloud storage.
          </p>
        ) : null}

        <Button
          variant="secondary"
          size="lg"
          className="w-full text-danger"
          onClick={async () => {
            await signOut()
            navigate('/login', { replace: true })
          }}
        >
          <LogOut aria-hidden /> Log out
        </Button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[26px] border border-line bg-surface p-5 shadow-soft sm:p-6">
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Row({ label, hint, value, children }: { label: string; hint?: string; value?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-[13px] text-muted">{hint}</p> : null}
      </div>
      {value ? <p className="truncate text-[15px] text-muted">{value}</p> : children}
    </div>
  )
}
