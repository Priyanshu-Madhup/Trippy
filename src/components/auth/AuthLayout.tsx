import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '@/components/brand/Logo'
import { BRAND } from '@/lib/brand'

/** Dusk-sky backdrop with a dotted flight path — no stock photo required. */
export function SkyBackdrop({ className = '' }: { className?: string }) {
  return (
    <div className={`grain absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_110%,#f1b77a_0%,#d9806a_22%,#6b4a7a_48%,#1d2747_75%,#0d1226_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_20%_10%,rgba(255,255,255,0.12),transparent)]" />
      <svg className="absolute inset-0 size-full" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
        <path d="M-40 620 C 160 420, 420 520, 560 300 S 820 120, 900 160" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="1.6" strokeDasharray="2 10" strokeLinecap="round" />
        <path d="M-40 720 C 220 600, 380 700, 620 520 S 860 420, 900 440" fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="2 12" strokeLinecap="round" />
        <circle cx="560" cy="300" r="7" fill="none" stroke="#F3C88F" strokeWidth="2.5" />
        <circle cx="96" cy="512" r="4" fill="white" fillOpacity="0.8" />
        {Array.from({ length: 40 }).map((_, i) => (
          <circle key={i} cx={(i * 197) % 800} cy={(i * 83) % 360} r={i % 5 === 0 ? 1.3 : 0.7} fill="white" fillOpacity={0.15 + (i % 4) * 0.1} />
        ))}
      </svg>
    </div>
  )
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Visual side */}
      <div className="relative hidden overflow-hidden lg:block">
        <SkyBackdrop />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" aria-label={`${BRAND.name} home`}>
            <Logo inverted />
          </Link>
          <div>
            <p className="font-serif text-[64px] italic leading-[0.95] tracking-[-0.02em]">Every journey,</p>
            <p className="text-[56px] font-semibold leading-[1] tracking-[-0.045em]">perfectly organised.</p>
            <p className="mt-6 max-w-md text-lg text-white/75">{BRAND.description}</p>
          </div>
          <p className="text-sm text-white/50">Flights · Hotels · Trains · Buses · Tickets · Documents</p>
        </div>
      </div>

      {/* Form side */}
      <div className="relative flex min-h-dvh flex-col bg-bg">
        <div className="absolute inset-x-0 top-0 h-[38dvh] lg:hidden">
          <SkyBackdrop />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-bg" />
        </div>
        <header className="pt-safe relative z-10 px-6 py-5 lg:hidden">
          <Link to="/" aria-label={`${BRAND.name} home`}>
            <Logo inverted />
          </Link>
        </header>
        <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-10 pt-[12dvh] sm:px-6 lg:items-center lg:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[420px] rounded-[28px] border border-line bg-surface/95 p-6 shadow-lift backdrop-blur-xl sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
