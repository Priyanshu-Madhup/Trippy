import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BedDouble, FileUp, Plane, ScanText, Sparkles } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { SkyBackdrop } from '@/components/auth/AuthLayout'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/utils'

export default function Landing() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/app" replace />

  return (
    <div className="min-h-dvh bg-bg">
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <SkyBackdrop />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <nav className="pt-safe flex items-center justify-between py-5">
            <Logo inverted />
            <div className="flex items-center gap-2">
              <Link to="/login" className={cn(buttonVariants({ variant: 'glass', size: 'sm' }), 'border-transparent bg-transparent')}>
                Sign in
              </Link>
              <Link to="/signup" className={cn(buttonVariants({ size: 'sm' }), 'bg-white text-[#111] hover:bg-white/90')}>
                Get started
              </Link>
            </div>
          </nav>

          <div className="grid items-center gap-12 pb-20 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[13px] font-medium backdrop-blur-md">
                <Sparkles className="size-3.5 text-[#F3C88F]" aria-hidden /> AI-organised travel documents
              </p>
              <h1 className="mt-6 text-[44px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[64px] lg:text-[76px]">
                Throw in your tickets.
                <span className="mt-1 block font-serif font-normal italic tracking-[-0.02em] text-[#F6D7AE]">We’ll plan the rest.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">{BRAND.description}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-[#111] hover:bg-white/90')}>
                  Start your first trip <ArrowRight aria-hidden />
                </Link>
                <Link to="/login" className={buttonVariants({ variant: 'glass', size: 'lg' })}>
                  I have an account
                </Link>
              </div>
            </motion.div>

            <HeroCards />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">How it works</p>
        <h2 className="mt-3 max-w-2xl text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[44px]">
          Upload → AI understands → <span className="font-serif font-normal italic">a beautiful card appears.</span>
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: FileUp, title: 'Drop anything', text: 'PDF e-tickets, screenshots, photos of boarding passes, hotel confirmations.' },
            { icon: ScanText, title: 'We read it', text: 'Vision OCR and GPT-OSS extract the route, dates, references and providers — never inventing what isn’t there.' },
            { icon: Sparkles, title: 'Your trip builds itself', text: 'Destination, dates, cover photo, airline and booking-site logos — all organised into a timeline.' },
          ].map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="rounded-[26px] border border-line bg-surface p-6 shadow-soft"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-surface-2">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:px-8">
          <Logo />
          <p>{BRAND.tagline}</p>
        </div>
      </footer>
    </div>
  )
}

function HeroCards() {
  return (
    <div className="relative mx-auto h-[380px] w-full max-w-[420px] sm:h-[420px]" aria-hidden>
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -6 }}
        animate={{ opacity: 1, y: 0, rotate: -5 }}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-0 top-6 w-[86%] rounded-[24px] bg-white p-5 text-[#111] shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#c8102e] text-xs font-bold text-white">EK</span>
            <span>
              <span className="block text-sm font-semibold">Emirates</span>
              <span className="block text-xs text-[#77746c]">EK569 · Economy</span>
            </span>
          </span>
          <span className="rounded-full bg-[#f1f0ec] px-2.5 py-1 text-[11px] font-medium">MakeMyTrip</span>
        </div>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[32px] font-semibold leading-none tracking-tight">BLR</p>
            <p className="mt-1 text-xs text-[#77746c]">Bengaluru</p>
            <p className="mt-1.5 font-mono text-sm font-semibold">04:15</p>
          </div>
          <div className="mb-8 flex flex-1 items-center gap-1 px-3 text-[#a7a49b]">
            <span className="h-px flex-1 bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)] bg-[length:6px_1px]" />
            <Plane className="size-4 rotate-45 text-[#111]" />
            <span className="h-px flex-1 bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)] bg-[length:6px_1px]" />
          </div>
          <div className="text-right">
            <p className="text-[32px] font-semibold leading-none tracking-tight">DXB</p>
            <p className="mt-1 text-xs text-[#77746c]">Dubai</p>
            <p className="mt-1.5 font-mono text-sm font-semibold">06:30</p>
          </div>
        </div>
        <div className="mt-5 border-t border-dashed border-black/15 pt-4 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <span>
              <span className="block text-[10px] uppercase tracking-widest text-[#a7a49b]">PNR</span>
              <span className="font-mono font-semibold">QX7K2M</span>
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-widest text-[#a7a49b]">Seat</span>
              <span className="font-mono font-semibold">24A</span>
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-widest text-[#a7a49b]">Date</span>
              <span className="font-semibold">12 OCT</span>
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40, rotate: 8 }}
        animate={{ opacity: 1, y: 0, rotate: 4 }}
        transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 right-0 w-[70%] overflow-hidden rounded-[24px] bg-white text-[#111] shadow-2xl"
      >
        <div className="h-28 bg-[linear-gradient(135deg,#2b3a67,#b7698a_55%,#f2c48d)]" />
        <div className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#77746c]">
            <BedDouble className="size-3.5" /> HOTEL · 4 NIGHTS
          </p>
          <p className="mt-1 text-[15px] font-semibold leading-snug">Marriott County Hall</p>
          <p className="text-xs text-[#77746c]">London, United Kingdom</p>
        </div>
      </motion.div>
    </div>
  )
}
