import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Map, Settings, Ticket } from 'lucide-react'
import { Avatar } from '@/components/layout/Avatar'
import { Skeleton } from '@/components/ui/misc'
import { buttonVariants } from '@/components/ui/button'
import { useAuth, useDisplayName, useProfile } from '@/hooks/useAuth'
import { useStats } from '@/hooks/useTickets'
import { formatUploaded } from '@/utils/date'

export default function Profile() {
  const { user } = useAuth()
  const name = useDisplayName()
  const { data: profile } = useProfile()
  const { data: stats, isLoading } = useStats()

  const cards = [
    { label: 'Trips', value: stats?.trips, icon: Map },
    { label: 'Tickets', value: stats?.tickets, icon: Ticket },
    { label: 'Documents', value: stats?.documents, icon: FileText },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 pt-safe sm:px-6">
      <div className="flex flex-col items-center pb-10 pt-12 text-center lg:pt-16">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
          <Avatar name={name} src={profile?.avatar_url} size={96} className="shadow-lift ring-4 ring-surface" />
        </motion.div>
        <h1 className="mt-5 text-[30px] font-semibold tracking-[-0.035em]">{name}</h1>
        <p className="mt-1 text-[15px] text-muted">{user?.email}</p>
        {profile?.created_at ? <p className="mt-1 text-xs text-faint">Travelling with us since {formatUploaded(profile.created_at)}</p> : null}
        <Link to="/app/settings" className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-5' })}>
          <Settings aria-hidden /> Edit in settings
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map(({ label, value, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-[24px] border border-line bg-surface p-4 shadow-soft sm:p-5"
          >
            <Icon className="size-5 text-muted" aria-hidden />
            {isLoading ? (
              <Skeleton className="mt-4 h-8 w-12" />
            ) : (
              <p className="mt-4 text-[32px] font-semibold leading-none tracking-[-0.04em] tabular">{value ?? 0}</p>
            )}
            <p className="mt-1.5 text-sm text-muted">{label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
